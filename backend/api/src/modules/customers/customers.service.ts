import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  UserRole,
  LoyaltyTier,
  RewardTransactionType,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerListQuery {
  search?: string;
  filter?: string;
  page?: number;
  limit?: number;
}

function computeTier(orderCount: number): LoyaltyTier {
  if (orderCount >= 31) return LoyaltyTier.PLATINUM;
  if (orderCount >= 16) return LoyaltyTier.GOLD;
  if (orderCount >= 6) return LoyaltyTier.SILVER;
  return LoyaltyTier.BRONZE;
}

function customerId(userId: string): string {
  return `CUST-${userId.slice(-6).toUpperCase()}`;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async getCustomerRoleId() {
    const role = await this.prisma.role.findUnique({ where: { name: UserRole.CUSTOMER } });
    return role?.id;
  }

  private async aggregateOrderStats(userId: string, phone?: string | null) {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ userId }, ...(phone ? [{ customerPhone: phone, userId: null }] : [])],
        status: { notIn: [OrderStatus.CANCELLED] },
      },
      select: { grandTotal: true, createdAt: true, paymentMethod: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const lastOrderAt = orders[0]?.createdAt ?? null;
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const paymentCounts = orders.reduce(
      (acc, o) => {
        acc[o.paymentMethod] = (acc[o.paymentMethod] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    const preferredPayment =
      Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { totalOrders, totalSpent, lastOrderAt, avgOrderValue, preferredPayment };
  }

  private mapListItem(
    user: Prisma.UserGetPayload<{ include: { role: true } }>,
    stats: Awaited<ReturnType<typeof this.aggregateOrderStats>>,
  ) {
    const isRepeat = stats.totalOrders >= 2;
    const isVip =
      user.tags.includes('VIP') ||
      user.loyaltyTier === LoyaltyTier.GOLD ||
      user.loyaltyTier === LoyaltyTier.PLATINUM;

    let customerType = 'Regular';
    if (user.isBlocked) customerType = 'Blocked';
    else if (isVip || user.tags.includes('VIP')) customerType = 'VIP';
    else if (isRepeat) customerType = 'Repeat';

    const inactiveDays = stats.lastOrderAt
      ? (Date.now() - stats.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const isInactive = inactiveDays > 90;

    return {
      id: user.id,
      customerId: customerId(user.id),
      name: user.name ?? 'Guest',
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      totalOrders: stats.totalOrders,
      totalSpent: stats.totalSpent,
      rewardPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      customerType,
      lastOrderAt: stats.lastOrderAt?.toISOString() ?? null,
      status: user.isBlocked
        ? 'Blocked'
        : user.isActive
          ? isInactive
            ? 'Inactive'
            : 'Active'
          : 'Inactive',
      tags: user.tags,
      isRepeat,
      isVip,
      isInactive,
      createdAt: user.createdAt.toISOString(),
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    };
  }

  async getDashboard() {
    const roleId = await this.getCustomerRoleId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const inactiveCutoff = new Date();
    inactiveCutoff.setDate(inactiveCutoff.getDate() - 90);

    const customers = await this.prisma.user.findMany({
      where: { roleId: roleId ?? undefined },
      include: { role: true },
    });

    let totalSpent = 0;
    let repeatCount = 0;
    let vipCount = 0;
    let inactiveCount = 0;
    const topSpenders: Array<{ id: string; name: string; totalSpent: number }> = [];
    const recentRegistrations: Array<{ id: string; name: string; createdAt: string }> = [];
    const birthdaysToday: Array<{ id: string; name: string; phone: string | null }> = [];
    const todayMonth = todayStart.getMonth() + 1;
    const todayDay = todayStart.getDate();

    for (const user of customers) {
      const stats = await this.aggregateOrderStats(user.id, user.phone);
      totalSpent += stats.totalSpent;
      if (stats.totalOrders >= 2) repeatCount++;
      if (
        user.tags.includes('VIP') ||
        user.loyaltyTier === LoyaltyTier.GOLD ||
        user.loyaltyTier === LoyaltyTier.PLATINUM
      )
        vipCount++;
      if (stats.lastOrderAt && stats.lastOrderAt < inactiveCutoff) inactiveCount++;

      topSpenders.push({ id: user.id, name: user.name ?? 'Guest', totalSpent: stats.totalSpent });

      if (user.createdAt >= todayStart) {
        recentRegistrations.push({
          id: user.id,
          name: user.name ?? 'Guest',
          createdAt: user.createdAt.toISOString(),
        });
      }

      if (user.dateOfBirth) {
        const dob = new Date(user.dateOfBirth);
        if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay) {
          birthdaysToday.push({ id: user.id, name: user.name ?? 'Guest', phone: user.phone });
        }
      }
    }

    topSpenders.sort((a, b) => b.totalSpent - a.totalSpent);

    const newToday = await this.prisma.user.count({
      where: { roleId: roleId ?? undefined, createdAt: { gte: todayStart } },
    });

    const pendingReviews = await this.prisma.review.count({
      where: { ownerReply: null },
    });

    const avgOrderValue = customers.length > 0 ? totalSpent / Math.max(1, customers.length) : 0;

    // Monthly growth (last 6 months)
    const growth: Array<{
      month: string;
      newCustomers: number;
      repeatCustomers: number;
      revenue: number;
    }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setMonth(end.getMonth() + 1);

      const newCustomers = await this.prisma.user.count({
        where: { roleId: roleId ?? undefined, createdAt: { gte: d, lt: end } },
      });

      const monthOrders = await this.prisma.order.findMany({
        where: { createdAt: { gte: d, lt: end }, status: { not: OrderStatus.CANCELLED } },
        select: { userId: true, customerPhone: true, grandTotal: true },
      });

      const orderCounts = new Map<string, number>();
      for (const o of monthOrders) {
        const key = o.userId ?? o.customerPhone;
        orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
      }
      const repeatCustomers = [...orderCounts.values()].filter((c) => c >= 2).length;
      const revenue = monthOrders.reduce((s, o) => s + Number(o.grandTotal), 0);

      growth.push({
        month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        newCustomers,
        repeatCustomers,
        revenue,
      });
    }

    return {
      stats: {
        totalCustomers: customers.length,
        newToday,
        repeatCustomers: repeatCount,
        vipCustomers: vipCount,
        inactiveCustomers: inactiveCount,
        avgOrderValue: Math.round(avgOrderValue),
        lifetimeRevenue: Math.round(totalSpent),
      },
      growth,
      topSpenders: topSpenders.slice(0, 5),
      recentRegistrations: recentRegistrations.slice(0, 5),
      birthdaysToday,
      pendingReviews,
    };
  }

  async listCustomers(query: CustomerListQuery) {
    const roleId = await this.getCustomerRoleId();
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { roleId: roleId ?? undefined };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.filter === 'blocked') where.isBlocked = true;
    if (query.filter === 'new') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.createdAt = { gte: weekAgo };
    }
    if (query.filter === 'vip') {
      where.OR = [
        { tags: { has: 'VIP' } },
        { loyaltyTier: { in: [LoyaltyTier.GOLD, LoyaltyTier.PLATINUM] } },
      ];
    }
    if (query.filter === 'birthday') {
      const today = new Date();
      // Prisma doesn't support month/day filter easily — filter in memory after fetch
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    let items = await Promise.all(
      users.map(async (user) => {
        const stats = await this.aggregateOrderStats(user.id, user.phone);
        return this.mapListItem(user, stats);
      }),
    );

    if (query.filter === 'repeat') items = items.filter((c) => c.isRepeat);
    if (query.filter === 'inactive') items = items.filter((c) => c.isInactive);
    if (query.filter === 'regular') items = items.filter((c) => !c.isVip && c.status !== 'Blocked');
    if (query.filter === 'birthday') {
      const today = new Date();
      items = items.filter((c) => {
        if (!c.dateOfBirth) return false;
        const dob = new Date(c.dateOfBirth);
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
      });
    }

    return { data: items, total, page, limit };
  }

  async getCustomer(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
        favorites: { include: { product: true } },
        reviews: { include: { product: true }, orderBy: { createdAt: 'desc' } },
        userCoupons: { include: { coupon: true } },
        customerNotes: { orderBy: { createdAt: 'desc' }, take: 20 },
        rewardTransactions: { orderBy: { createdAt: 'desc' }, take: 50 },
        customerActivities: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const stats = await this.aggregateOrderStats(user.id, user.phone);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ userId: id }, ...(user.phone ? [{ customerPhone: user.phone }] : [])],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const favoriteProducts = user.favorites.map((f) => ({
      id: f.product.id,
      name: f.product.name,
      imageUrl: f.product.imageUrl,
      orderCount: orders.filter((o) => o.items.some((i) => i.productId === f.productId)).length,
    }));

    favoriteProducts.sort((a, b) => b.orderCount - a.orderCount);

    const timeline = [
      {
        type: 'REGISTERED',
        description: 'Account created',
        createdAt: user.createdAt.toISOString(),
      },
      ...user.customerActivities.map((a) => ({
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (orders.length > 0) {
      const first = orders[orders.length - 1];
      timeline.push({
        type: 'FIRST_ORDER',
        description: `First order #${first.orderNumber}`,
        createdAt: first.createdAt.toISOString(),
      });
    }
    if (orders[0]) {
      timeline.push({
        type: 'LATEST_ORDER',
        description: `Latest order #${orders[0].orderNumber}`,
        createdAt: orders[0].createdAt.toISOString(),
      });
    }

    timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const totalEarned = user.rewardTransactions
      .filter((t) => t.type === RewardTransactionType.EARN)
      .reduce((s, t) => s + t.points, 0);
    const totalRedeemed = user.rewardTransactions
      .filter((t) => t.type === RewardTransactionType.REDEEM)
      .reduce((s, t) => s + Math.abs(t.points), 0);

    return {
      ...this.mapListItem(user, stats),
      registeredDate: user.createdAt.toISOString(),
      preferredPayment: user.preferredPayment ?? stats.preferredPayment,
      preferredDelivery: user.preferredDelivery ?? 'Delivery',
      avgOrderValue: stats.avgOrderValue,
      adminNotes: user.adminNotes,
      addresses: user.addresses,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        grandTotal: Number(o.grandTotal),
        paymentMethod: o.paymentMethod,
        status: o.status,
        deliveryAddress: o.deliveryAddress,
      })),
      favorites: favoriteProducts,
      reviews: user.reviews.map((r) => ({
        id: r.id,
        productName: r.product?.name ?? 'General',
        rating: r.rating,
        comment: r.comment,
        ownerReply: r.ownerReply,
        createdAt: r.createdAt.toISOString(),
      })),
      coupons: user.userCoupons.map((uc) => ({
        id: uc.id,
        code: uc.coupon.code,
        type: uc.coupon.type,
        value: Number(uc.coupon.value),
        expiresAt: uc.expiresAt?.toISOString() ?? uc.coupon.expiresAt?.toISOString() ?? null,
        usedAt: uc.usedAt?.toISOString() ?? null,
        status: uc.usedAt ? 'Used' : 'Active',
      })),
      notes: user.customerNotes,
      rewards: {
        current: user.loyaltyPoints,
        totalEarned,
        totalRedeemed,
        available: user.loyaltyPoints,
        transactions: user.rewardTransactions.map((t) => ({
          id: t.id,
          points: t.points,
          balance: t.balance,
          type: t.type,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        })),
      },
      timeline,
      loyaltyProgress: {
        tier: user.loyaltyTier,
        orderCount: stats.totalOrders,
        nextTier: computeTier(stats.totalOrders + 1),
      },
    };
  }

  async updateCustomer(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      tags?: string[];
      adminNotes?: string;
      preferredPayment?: string;
      preferredDelivery?: string;
      isBlocked?: boolean;
      isActive?: boolean;
      loyaltyPoints?: number;
      loyaltyTier?: LoyaltyTier;
    },
    adminId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        tags: data.tags,
        adminNotes: data.adminNotes,
        preferredPayment: data.preferredPayment as PaymentMethod | undefined,
        preferredDelivery: data.preferredDelivery,
        isBlocked: data.isBlocked,
        isActive: data.isActive,
        loyaltyPoints: data.loyaltyPoints,
        loyaltyTier: data.loyaltyTier,
      },
    });

    await this.prisma.customerActivity.create({
      data: {
        userId: id,
        type: 'UPDATED',
        description: 'Profile updated by admin',
        metadata: { adminId },
      },
    });

    return updated;
  }

  async addNote(userId: string, content: string, createdById?: string) {
    const note = await this.prisma.customerNote.create({
      data: { userId, content, createdById },
    });
    await this.prisma.customerActivity.create({
      data: { userId, type: 'NOTE_ADDED', description: content.slice(0, 100) },
    });
    return note;
  }

  async adjustRewards(userId: string, points: number, description: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Customer not found');

    const newBalance = user.loyaltyPoints + points;
    if (newBalance < 0) throw new BadRequestException('Insufficient points');

    await this.prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: newBalance },
    });

    return this.prisma.rewardTransaction.create({
      data: {
        userId,
        points,
        balance: newBalance,
        type: points >= 0 ? RewardTransactionType.ADJUST : RewardTransactionType.REDEEM,
        description,
      },
    });
  }

  async resetRewards(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Customer not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: 0 },
    });

    return this.prisma.rewardTransaction.create({
      data: {
        userId,
        points: -user.loyaltyPoints,
        balance: 0,
        type: RewardTransactionType.RESET,
        description: 'Rewards reset by admin',
      },
    });
  }

  async assignCoupon(userId: string, couponId: string, expiresAt?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    return this.prisma.userCoupon.upsert({
      where: { userId_couponId: { userId, couponId } },
      update: {},
      create: {
        userId,
        couponId,
        expiresAt: expiresAt ? new Date(expiresAt) : coupon.expiresAt,
      },
      include: { coupon: true },
    });
  }

  async replyReview(reviewId: string, reply: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: reply },
    });
  }

  async findDuplicates() {
    const users = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true, email: true, name: true },
    });

    const phoneMap = new Map<string, typeof users>();
    for (const u of users) {
      if (!u.phone) continue;
      const list = phoneMap.get(u.phone) ?? [];
      list.push(u);
      phoneMap.set(u.phone, list);
    }

    return [...phoneMap.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([phone, list]) => ({ phone, customers: list }));
  }

  async mergeCustomers(keepId: string, mergeId: string) {
    if (keepId === mergeId) throw new BadRequestException('Cannot merge same customer');

    await this.prisma.order.updateMany({
      where: { userId: mergeId },
      data: { userId: keepId },
    });
    await this.prisma.address.updateMany({
      where: { userId: mergeId },
      data: { userId: keepId },
    });
    await this.prisma.review.updateMany({
      where: { userId: mergeId },
      data: { userId: keepId },
    });
    await this.prisma.favorite.updateMany({
      where: { userId: mergeId },
      data: { userId: keepId },
    });

    await this.prisma.user.delete({ where: { id: mergeId } });

    await this.prisma.customerActivity.create({
      data: {
        userId: keepId,
        type: 'MERGED',
        description: `Merged duplicate customer ${mergeId}`,
      },
    });

    return { success: true, keptId: keepId };
  }

  async blockCustomer(id: string, blocked: boolean) {
    return this.updateCustomer(id, { isBlocked: blocked });
  }

  async deleteCustomer(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Customer not found');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
