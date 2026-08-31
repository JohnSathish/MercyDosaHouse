import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LoyaltyProgramKey,
  LoyaltyTxnType,
  NotificationType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import type {
  LoyaltyAccountDto,
  LoyaltyConfigDto,
  LoyaltyDashboardDto,
  LoyaltyMeDto,
  LoyaltyPublicConfigDto,
  LoyaltyQuoteDto,
  LoyaltyTransactionDto,
} from '@mdh/types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { parseLoyaltyConfig, publicLoyaltyConfig } from './loyalty-config';

type Tx = Prisma.TransactionClient;

const PROGRAM: LoyaltyProgramKey = LoyaltyProgramKey.BRONZE;

@Injectable()
export class LoyaltyService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getConfig(): Promise<LoyaltyConfigDto> {
    const settings = await this.prisma.businessSettings.findFirst({
      select: { loyaltyConfig: true },
    });
    return parseLoyaltyConfig(settings?.loyaltyConfig);
  }

  async updateConfig(patch: Record<string, unknown>): Promise<LoyaltyConfigDto> {
    let settings = await this.prisma.businessSettings.findFirst();
    if (!settings) settings = await this.prisma.businessSettings.create({ data: {} });
    const next = parseLoyaltyConfig({ ...parseLoyaltyConfig(settings.loyaltyConfig), ...patch });
    await this.prisma.businessSettings.update({
      where: { id: settings.id },
      data: { loyaltyConfig: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }

  async publicConfig(): Promise<LoyaltyPublicConfigDto> {
    return publicLoyaltyConfig(await this.getConfig());
  }

  async snapshot(userId: string): Promise<LoyaltyAccountDto> {
    const cfg = await this.getConfig();
    await this.expireIfNeeded(userId, cfg);
    const account = await this.ensureAccount(this.prisma, userId);
    const pending = await this.computePending(userId, cfg);
    if (account.pending !== pending) {
      await this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { pending },
      });
    }
    return this.toAccountDto({ ...account, pending }, cfg);
  }

  async me(userId: string): Promise<LoyaltyMeDto> {
    const [account, config, rows] = await Promise.all([
      this.snapshot(userId),
      this.publicConfig(),
      this.prisma.loyaltyTransaction.findMany({
        where: { userId, programKey: PROGRAM },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          order: { select: { orderNumber: true } },
          createdBy: { select: { name: true } },
        },
      }),
    ]);
    return {
      account,
      config,
      transactions: rows.map((t) => this.mapTxn(t)),
    };
  }

  async history(userId: string, page = 1, limit = 30) {
    const take = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { userId, programKey: PROGRAM },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          order: { select: { orderNumber: true } },
          createdBy: { select: { name: true } },
        },
      }),
      this.prisma.loyaltyTransaction.count({ where: { userId, programKey: PROGRAM } }),
    ]);
    return {
      data: data.map((t) => this.mapTxn(t)),
      total,
      page: Math.max(1, page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async quote(params: {
    userId?: string;
    requestedCoins: number;
    subtotal: number;
    deliveryCharge: number;
    packingCharge: number;
    taxAmount?: number;
    couponDiscount: number;
    couponApplied: boolean;
  }): Promise<LoyaltyQuoteDto> {
    const cfg = await this.getConfig();
    const publicCfg = publicLoyaltyConfig(cfg);
    const empty: LoyaltyQuoteDto = {
      enabled: cfg.enabled,
      available: 0,
      pending: 0,
      coinValue: cfg.coinValue,
      minRedeem: cfg.minRedeem,
      maxRedeem: cfg.maxRedeemPerOrder,
      minOrderToRedeem: cfg.minOrderToRedeem,
      allowWithCoupons: cfg.allowWithCoupons,
      coins: 0,
      discount: 0,
      remainingAfter: 0,
      coinsToEarn: this.earnAmount(cfg, params.subtotal, params.subtotal + params.deliveryCharge),
      earnWhenLabel: publicCfg.earnWhenLabel,
      blockedReason: cfg.enabled ? null : 'Loyalty is currently paused.',
    };
    if (!params.userId) return empty;
    const account = await this.snapshot(params.userId);
    empty.available = account.available;
    empty.pending = account.pending;
    empty.remainingAfter = account.available;
    if (!cfg.enabled) return empty;

    const result = this.computeRedeem(cfg, {
      available: account.available,
      requested: params.requestedCoins,
      subtotal: params.subtotal,
      deliveryCharge: params.deliveryCharge,
      packingCharge: params.packingCharge,
      taxAmount: params.taxAmount ?? 0,
      couponDiscount: params.couponDiscount,
      couponApplied: params.couponApplied,
    });
    return {
      ...empty,
      coins: result.coins,
      discount: result.discount,
      remainingAfter: Math.max(0, account.available - result.coins),
      blockedReason: result.reason,
    };
  }

  computeRedeem(
    cfg: LoyaltyConfigDto,
    input: {
      available: number;
      requested: number;
      subtotal: number;
      deliveryCharge: number;
      packingCharge: number;
      taxAmount: number;
      couponDiscount: number;
      couponApplied: boolean;
    },
  ): { coins: number; discount: number; reason: string | null } {
    const requested = Math.max(0, Math.floor(input.requested || 0));
    if (!requested) return { coins: 0, discount: 0, reason: null };
    if (!cfg.enabled) return { coins: 0, discount: 0, reason: 'Loyalty is currently paused.' };
    if (input.couponApplied && !cfg.allowWithCoupons) {
      return { coins: 0, discount: 0, reason: 'Bronze Coins cannot be combined with coupons.' };
    }
    if (input.subtotal < cfg.minOrderToRedeem) {
      return {
        coins: 0,
        discount: 0,
        reason: `Minimum order of ₹${cfg.minOrderToRedeem} required to redeem coins.`,
      };
    }
    if (requested < cfg.minRedeem) {
      return {
        coins: 0,
        discount: 0,
        reason: `Redeem at least ${cfg.minRedeem} Bronze Coins.`,
      };
    }
    if (input.available < cfg.minRedeem) {
      return { coins: 0, discount: 0, reason: 'Not enough Bronze Coins to redeem yet.' };
    }

    let eligible =
      input.subtotal - input.couponDiscount + (cfg.allowOnDelivery ? input.deliveryCharge : 0);
    if (cfg.allowOnDelivery) eligible += input.packingCharge;
    if (cfg.allowOnTax) eligible += input.taxAmount;
    eligible = Math.max(0, eligible);

    const maxByValue = cfg.coinValue > 0 ? Math.floor(eligible / cfg.coinValue) : 0;
    const maxByCap = cfg.maxRedeemPerOrder;
    const maxByDiscount = cfg.coinValue > 0 ? Math.floor(cfg.maxDiscount / cfg.coinValue) : 0;
    const coins = Math.min(requested, input.available, maxByCap, maxByValue, maxByDiscount);
    if (coins < cfg.minRedeem) {
      return { coins: 0, discount: 0, reason: 'This order cannot use the minimum coin amount.' };
    }
    const discount = Math.min(coins * cfg.coinValue, cfg.maxDiscount, eligible);
    return { coins, discount, reason: null };
  }

  async applyRedemption(
    tx: Tx,
    params: {
      userId: string;
      orderId: string;
      orderNumber: string;
      coins: number;
      discount: number;
    },
  ) {
    if (params.coins <= 0) return;
    await this.ensureAccount(tx, params.userId);
    const claimed = await tx.loyaltyAccount.updateMany({
      where: {
        userId: params.userId,
        programKey: PROGRAM,
        available: { gte: params.coins },
      },
      data: {
        available: { decrement: params.coins },
        totalRedeemed: { increment: params.coins },
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Insufficient Bronze Coins');
    }
    const account = await tx.loyaltyAccount.findUniqueOrThrow({
      where: { userId_programKey: { userId: params.userId, programKey: PROGRAM } },
    });
    await this.consumeEarnFifo(tx, params.userId, params.coins);
    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        userId: params.userId,
        programKey: PROGRAM,
        orderId: params.orderId,
        type: LoyaltyTxnType.REDEEM,
        coins: -params.coins,
        remaining: 0,
        balanceAfter: account.available,
        description: `Redeemed on Order #${params.orderNumber}`,
        reference: `redeem:${params.orderId}:BRONZE`,
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: { loyaltyPoints: account.available },
    });
    await tx.rewardTransaction.create({
      data: {
        userId: params.userId,
        orderId: params.orderId,
        type: 'REDEEM',
        points: -params.coins,
        balance: account.available,
        description: `Redeemed on Order #${params.orderNumber}`,
      },
    });
  }

  async notifyRedeemed(userId: string, coins: number, discount: number, available: number) {
    const cfg = await this.getConfig();
    await this.notifications.create({
      userId,
      type: NotificationType.LOYALTY,
      title: `${cfg.coinSymbol} ${cfg.coinName} Redeemed`,
      body: `You used ${coins} ${cfg.coinName} and saved ₹${discount} on your order.`,
      data: {
        type: 'LOYALTY',
        screen: 'loyalty',
        available,
        coins: -coins,
      },
    });
  }

  async awardForOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        subtotal: true,
        grandTotal: true,
        paymentStatus: true,
      },
    });
    if (!order?.userId) return;
    const cfg = await this.getConfig();
    if (!this.shouldEarn(cfg, order.status, Number(order.grandTotal), Number(order.subtotal))) {
      return;
    }
    const coins = this.earnAmount(cfg, Number(order.subtotal), Number(order.grandTotal));
    if (coins <= 0) return;
    const reference = `earn:${order.id}:BRONZE`;
    try {
      await this.prisma.$transaction(async (tx) => {
        const account = await this.ensureAccount(tx, order.userId!);
        const expiresAt =
          cfg.expiryDays > 0 ? new Date(Date.now() + cfg.expiryDays * 24 * 60 * 60 * 1000) : null;
        await tx.loyaltyTransaction.create({
          data: {
            accountId: account.id,
            userId: order.userId!,
            programKey: PROGRAM,
            orderId: order.id,
            type: LoyaltyTxnType.EARN,
            coins,
            remaining: coins,
            balanceAfter: account.available + coins,
            description: `Order #${order.orderNumber} completed`,
            reference,
            expiresAt,
          },
        });
        const updated = await tx.loyaltyAccount.update({
          where: { id: account.id },
          data: {
            available: { increment: coins },
            totalEarned: { increment: coins },
            pending: { decrement: Math.min(account.pending, coins) },
          },
        });
        await tx.user.update({
          where: { id: order.userId! },
          data: { loyaltyPoints: updated.available },
        });
        await tx.rewardTransaction.create({
          data: {
            userId: order.userId!,
            orderId: order.id,
            type: 'EARN',
            points: coins,
            balance: updated.available,
            description: `Order #${order.orderNumber} completed`,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }

    const snap = await this.snapshot(order.userId);
    await this.notifications.create({
      userId: order.userId,
      type: NotificationType.LOYALTY,
      title: `${cfg.coinSymbol} You earned a Bronze Coin!`,
      body: `Your order has been completed successfully. You now have ${snap.available} ${cfg.coinName} (₹${snap.valueAvailable}) available to redeem.`,
      data: { type: 'LOYALTY', screen: 'loyalty', available: snap.available, coins },
    });
  }

  async reverseForOrder(orderId: string, kind: 'CANCELLED' | 'REFUNDED'): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true, rewardPointsUsed: true },
    });
    if (!order?.userId) return;
    const cfg = await this.getConfig();
    const restoreRedeem =
      (kind === 'CANCELLED' || kind === 'REFUNDED') && order.rewardPointsUsed > 0;
    const reverseEarn = kind === 'CANCELLED' ? !cfg.earnOnCancelled : !cfg.earnOnRefunded;

    await this.prisma.$transaction(async (tx) => {
      if (restoreRedeem) {
        await this.credit(
          tx,
          {
            userId: order.userId!,
            orderId: order.id,
            coins: order.rewardPointsUsed,
            type: LoyaltyTxnType.REFUND,
            description: `Returned from cancelled Order #${order.orderNumber}`,
            reference: `refund-redeem:${order.id}:BRONZE`,
          },
          cfg,
        );
      }
      if (reverseEarn) {
        const earned = await tx.loyaltyTransaction.findFirst({
          where: { reference: `earn:${order.id}:BRONZE` },
        });
        if (earned && earned.coins > 0) {
          await this.debitIfAvailable(
            tx,
            {
              userId: order.userId!,
              orderId: order.id,
              coins: earned.remaining > 0 ? earned.remaining : earned.coins,
              type: LoyaltyTxnType.REVERSAL,
              description: `Reversed earn from Order #${order.orderNumber}`,
              reference: `reverse-earn:${order.id}:BRONZE`,
            },
            true,
          );
          if (earned.remaining > 0) {
            await tx.loyaltyTransaction.update({
              where: { id: earned.id },
              data: { remaining: 0 },
            });
          }
        }
      }
    });
  }

  async adjust(userId: string, coins: number, reason: string, adminId?: string) {
    const trimmed = reason.trim();
    if (!trimmed) throw new BadRequestException('Reason is required');
    const amount = Math.floor(coins);
    if (!amount) throw new BadRequestException('Enter a coin amount');
    const cfg = await this.getConfig();
    return this.prisma.$transaction(async (tx) => {
      if (amount > 0) {
        return this.credit(
          tx,
          {
            userId,
            coins: amount,
            type: LoyaltyTxnType.ADMIN_ADJUSTMENT,
            description: trimmed,
            reference: `admin-add:${userId}:${Date.now()}`,
            createdById: adminId,
          },
          cfg,
        );
      }
      return this.debitIfAvailable(
        tx,
        {
          userId,
          coins: Math.abs(amount),
          type: LoyaltyTxnType.ADMIN_ADJUSTMENT,
          description: trimmed,
          reference: `admin-deduct:${userId}:${Date.now()}`,
          createdById: adminId,
        },
        false,
      );
    });
  }

  async dashboard(): Promise<LoyaltyDashboardDto> {
    const cfg = await this.getConfig();
    const [agg, customers] = await Promise.all([
      this.prisma.loyaltyAccount.aggregate({
        where: { programKey: PROGRAM },
        _sum: { totalEarned: true, totalRedeemed: true, available: true },
      }),
      this.prisma.loyaltyAccount.findMany({
        where: { programKey: PROGRAM },
        orderBy: { available: 'desc' },
        take: 200,
        include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      }),
    ]);
    const totalIssued = agg._sum.totalEarned ?? 0;
    const totalRedeemed = agg._sum.totalRedeemed ?? 0;
    const outstanding = agg._sum.available ?? 0;
    return {
      totalIssued,
      totalRedeemed,
      outstanding,
      rewardValue: outstanding * cfg.coinValue,
      coinValue: cfg.coinValue,
      customers: customers.map((c) => ({
        id: c.user.id,
        name: c.user.name || c.user.phone || 'Customer',
        phone: c.user.phone,
        email: c.user.email,
        available: c.available,
        earned: c.totalEarned,
        redeemed: c.totalRedeemed,
      })),
    };
  }

  earnPreview(subtotal: number, grandTotal: number, cfg?: LoyaltyConfigDto): number {
    const config = cfg ?? parseLoyaltyConfig(undefined);
    return this.earnAmount(config, subtotal, grandTotal);
  }

  private earnAmount(cfg: LoyaltyConfigDto, subtotal: number, grandTotal: number): number {
    if (!cfg.enabled) return 0;
    if (grandTotal < cfg.minOrderToEarn && subtotal < cfg.minOrderToEarn) return 0;
    if (cfg.earnMode === 'PER_AMOUNT') {
      return Math.floor(subtotal / cfg.amountPerCoin);
    }
    return Math.max(0, cfg.coinsPerOrder);
  }

  private shouldEarn(
    cfg: LoyaltyConfigDto,
    status: OrderStatus,
    grandTotal: number,
    subtotal: number,
  ): boolean {
    if (!cfg.enabled) return false;
    if (!cfg.eligibleStatuses.includes(status)) return false;
    if (status === OrderStatus.CANCELLED && !cfg.earnOnCancelled) return false;
    return this.earnAmount(cfg, subtotal, grandTotal) > 0;
  }

  private async computePending(userId: string, cfg: LoyaltyConfigDto): Promise<number> {
    if (!cfg.enabled) return 0;
    const open = await this.prisma.order.findMany({
      where: {
        userId,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      select: { id: true, subtotal: true, grandTotal: true },
    });
    const awarded = await this.prisma.loyaltyTransaction.findMany({
      where: {
        userId,
        type: LoyaltyTxnType.EARN,
        orderId: { in: open.map((o) => o.id) },
      },
      select: { orderId: true },
    });
    const awardedIds = new Set(awarded.map((a) => a.orderId));
    return open.reduce((sum, o) => {
      if (awardedIds.has(o.id)) return sum;
      return sum + this.earnAmount(cfg, Number(o.subtotal), Number(o.grandTotal));
    }, 0);
  }

  private async ensureAccount(db: PrismaService | Tx, userId: string) {
    const existing = await db.loyaltyAccount.findUnique({
      where: { userId_programKey: { userId, programKey: PROGRAM } },
    });
    if (existing) return existing;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw new NotFoundException('Customer not found');
    return db.loyaltyAccount.create({
      data: {
        userId,
        programKey: PROGRAM,
        available: Math.max(0, user.loyaltyPoints),
        totalEarned: Math.max(0, user.loyaltyPoints),
      },
    });
  }

  private async credit(
    tx: Tx,
    params: {
      userId: string;
      orderId?: string;
      coins: number;
      type: LoyaltyTxnType;
      description: string;
      reference: string;
      createdById?: string;
    },
    cfg: LoyaltyConfigDto,
  ) {
    const existing = await tx.loyaltyTransaction.findUnique({
      where: { reference: params.reference },
    });
    if (existing) return existing;
    const account = await this.ensureAccount(tx, params.userId);
    const expiresAt =
      params.type === LoyaltyTxnType.EARN && cfg.expiryDays > 0
        ? new Date(Date.now() + cfg.expiryDays * 24 * 60 * 60 * 1000)
        : params.type === LoyaltyTxnType.REFUND && cfg.expiryDays > 0
          ? new Date(Date.now() + cfg.expiryDays * 24 * 60 * 60 * 1000)
          : null;
    const updated = await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        available: { increment: params.coins },
        ...(params.type === LoyaltyTxnType.EARN
          ? { totalEarned: { increment: params.coins } }
          : {}),
        ...(params.type === LoyaltyTxnType.REFUND
          ? { totalRefunded: { increment: params.coins } }
          : {}),
      },
    });
    const row = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        userId: params.userId,
        programKey: PROGRAM,
        orderId: params.orderId,
        type: params.type,
        coins: params.coins,
        remaining: params.coins,
        balanceAfter: updated.available,
        description: params.description,
        reference: params.reference,
        createdById: params.createdById,
        expiresAt,
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: { loyaltyPoints: updated.available },
    });
    return row;
  }

  private async debitIfAvailable(
    tx: Tx,
    params: {
      userId: string;
      orderId?: string;
      coins: number;
      type: LoyaltyTxnType;
      description: string;
      reference: string;
      createdById?: string;
    },
    allowPartial: boolean,
  ) {
    const existing = await tx.loyaltyTransaction.findUnique({
      where: { reference: params.reference },
    });
    if (existing) return existing;
    const account = await this.ensureAccount(tx, params.userId);
    const take = allowPartial ? Math.min(account.available, params.coins) : params.coins;
    if (take <= 0) return null;
    if (!allowPartial && account.available < take) {
      throw new BadRequestException('Insufficient Bronze Coins');
    }
    const claimed = await tx.loyaltyAccount.updateMany({
      where: { id: account.id, available: { gte: take } },
      data: {
        available: { decrement: take },
        ...(params.type === LoyaltyTxnType.EXPIRY ? { totalExpired: { increment: take } } : {}),
      },
    });
    if (claimed.count !== 1) throw new BadRequestException('Insufficient Bronze Coins');
    const updated = await tx.loyaltyAccount.findUniqueOrThrow({ where: { id: account.id } });
    await this.consumeEarnFifo(tx, params.userId, take);
    const row = await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        userId: params.userId,
        programKey: PROGRAM,
        orderId: params.orderId,
        type: params.type,
        coins: -take,
        remaining: 0,
        balanceAfter: updated.available,
        description: params.description,
        reference: params.reference,
        createdById: params.createdById,
      },
    });
    await tx.user.update({
      where: { id: params.userId },
      data: { loyaltyPoints: updated.available },
    });
    return row;
  }

  private async consumeEarnFifo(tx: Tx, userId: string, coins: number) {
    let left = coins;
    const rows = await tx.loyaltyTransaction.findMany({
      where: { userId, programKey: PROGRAM, remaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });
    for (const row of rows) {
      if (left <= 0) break;
      const take = Math.min(row.remaining, left);
      await tx.loyaltyTransaction.update({
        where: { id: row.id },
        data: { remaining: row.remaining - take },
      });
      left -= take;
    }
  }

  private async expireIfNeeded(userId: string, cfg: LoyaltyConfigDto) {
    if (cfg.expiryDays <= 0) return;
    const now = new Date();
    const stale = await this.prisma.loyaltyTransaction.findMany({
      where: {
        userId,
        programKey: PROGRAM,
        remaining: { gt: 0 },
        expiresAt: { lte: now },
      },
    });
    for (const row of stale) {
      await this.prisma
        .$transaction((tx) =>
          this.debitIfAvailable(
            tx,
            {
              userId,
              orderId: row.orderId ?? undefined,
              coins: row.remaining,
              type: LoyaltyTxnType.EXPIRY,
              description: 'Bronze Coins expired',
              reference: `expiry:${row.id}`,
            },
            true,
          ),
        )
        .catch(() => undefined);
    }
  }

  private toAccountDto(
    account: {
      available: number;
      pending: number;
      totalEarned: number;
      totalRedeemed: number;
      totalExpired: number;
    },
    cfg: LoyaltyConfigDto,
  ): LoyaltyAccountDto {
    return {
      programKey: 'BRONZE' as const,
      available: account.available,
      pending: Math.max(0, account.pending),
      totalEarned: account.totalEarned,
      totalRedeemed: account.totalRedeemed,
      totalExpired: account.totalExpired,
      valueAvailable: account.available * cfg.coinValue,
      coinValue: cfg.coinValue,
      coinName: cfg.coinName,
      coinSymbol: cfg.coinSymbol,
      enabled: cfg.enabled,
    };
  }

  private mapTxn(t: {
    id: string;
    orderId: string | null;
    type: LoyaltyTxnType;
    coins: number;
    balanceAfter: number;
    description: string;
    reference: string | null;
    createdAt: Date;
    order?: { orderNumber: string } | null;
    createdBy?: { name: string | null } | null;
  }): LoyaltyTransactionDto {
    return {
      id: t.id,
      orderId: t.orderId,
      orderNumber: t.order?.orderNumber ?? null,
      type: t.type,
      coins: t.coins,
      balanceAfter: t.balanceAfter,
      description: t.description,
      reference: t.reference,
      createdBy: t.createdBy?.name ?? (t.reference?.startsWith('admin') ? 'Admin' : 'System'),
      createdAt: t.createdAt.toISOString(),
    };
  }
}
