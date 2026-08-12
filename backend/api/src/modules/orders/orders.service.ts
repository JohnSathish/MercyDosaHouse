import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, TrackingStatus } from '@prisma/client';
import { calculatePreOrderDiscount, calculateDeliveryCharge, isPreOrderEligible } from '@mdh/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private orderEmailNotification: OrderEmailNotificationService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    await this.linkOrphanOrdersByPhone();
  }

  /** Attach guest orders to accounts when phone numbers match */
  private async linkOrphanOrdersByPhone() {
    const orphans = await this.prisma.order.findMany({
      where: { userId: null },
      select: { id: true, customerPhone: true },
    });
    if (!orphans.length) return;

    const users = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true },
    });
    const phoneToUser = new Map(users.filter((u) => u.phone).map((u) => [u.phone!, u.id]));

    for (const order of orphans) {
      const userId = phoneToUser.get(order.customerPhone);
      if (userId) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { userId },
        });
      }
    }
  }

  async findForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.phone) {
      await this.prisma.order.updateMany({
        where: { userId: null, customerPhone: user.phone },
        data: { userId },
      });
    }

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async quote(data: {
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
    scheduledDeliveryAt?: Date;
    rewardPointsUsed?: number;
  }) {
    await this.settingsService.assertAcceptingOnlineOrders();
    if (!data.items.length) throw new BadRequestException('Cart is empty');
    const pricing = await this.computePricing(data);
    return {
      subtotal: pricing.subtotal,
      deliveryCharge: pricing.deliveryCharge,
      packingCharge: pricing.packingCharge,
      packedItemCount: pricing.packedItemCount,
      preOrderDiscount: pricing.preOrderDiscount,
      couponDiscount: pricing.couponDiscount,
      rewardDiscount: pricing.rewardDiscount,
      totalDiscount: pricing.totalDiscount,
      grandTotal: pricing.grandTotal,
      minOrderAmount: pricing.minOrderAmount,
      items: pricing.orderItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        packingCharge: i.packingCharge,
      })),
    };
  }

  async create(data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    paymentMethod: PaymentMethod;
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
    addressId?: string;
    scheduledDeliveryAt?: Date;
    rewardPointsUsed?: number;
  }) {
    await this.settingsService.assertAcceptingOnlineOrders();
    if (!data.items.length) throw new BadRequestException('Order must have items');

    const pricing = await this.computePricing(data);
    const orderNumber = await this.generateOrderNumber();
    const branch = await this.prisma.branch.findFirst({ where: { isDefault: true } });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          branchId: branch?.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          deliveryAddress: data.deliveryAddress,
          addressId: data.addressId,
          scheduledDeliveryAt: data.scheduledDeliveryAt,
          rewardPointsUsed: pricing.rewardPointsUsed,
          deliveryInstructions: data.deliveryInstructions,
          subtotal: pricing.subtotal,
          deliveryCharge: pricing.deliveryCharge,
          packingCharge: pricing.packingCharge,
          packedItemCount: pricing.packedItemCount,
          preOrderDiscount: pricing.preOrderDiscount,
          discount: pricing.totalDiscount,
          grandTotal: pricing.grandTotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          couponId: pricing.couponId,
          deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
          items: { create: pricing.orderItems },
        },
        include: { items: true, payment: true },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          method: data.paymentMethod,
          status: PaymentStatus.PENDING,
          amount: pricing.grandTotal,
        },
      });

      if (pricing.couponId) {
        await tx.coupon.update({
          where: { id: pricing.couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      if (pricing.rewardPointsUsed > 0 && data.userId) {
        const updatedUser = await tx.user.update({
          where: { id: data.userId },
          data: { loyaltyPoints: { decrement: pricing.rewardPointsUsed } },
        });
        await tx.rewardTransaction.create({
          data: {
            userId: data.userId,
            type: 'REDEEM',
            points: -pricing.rewardPointsUsed,
            balance: updatedUser.loyaltyPoints,
            description: `Redeemed on order ${orderNumber}`,
          },
        });
      }

      if (data.userId && data.paymentMethod) {
        await tx.user.update({
          where: { id: data.userId },
          data: { preferredPayment: data.paymentMethod, lastOrderAt: new Date() },
        });
      }

      return created;
    });

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: OrderStatus.PENDING,
        remarks: 'Order placed',
      },
    });

    this.gateway.emitNewOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      orderType: order.orderType,
      grandTotal: Number(order.grandTotal),
    });
    if (this.orderEmailNotification.shouldNotifyOnOrderCreate(data.paymentMethod)) {
      void this.orderEmailNotification.notifyOrderConfirmed(order.id);
      void this.notificationsService.notifyStaffNewOrder(order.id);
    }
    return this.findOne(order.id);
  }

  private async computePricing(data: {
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
    scheduledDeliveryAt?: Date;
    rewardPointsUsed?: number;
  }) {
    const settings = await this.prisma.businessSettings.findFirst();
    const minOrder = Number(settings?.minOrderAmount || 100);

    const productIds = data.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
      include: { variants: true },
    });

    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Some products are unavailable');
    }

    let subtotal = 0;
    let packingCharge = 0;
    let packedItemCount = 0;
    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      let unitPrice = Number(product.price);
      let variantName: string | undefined;
      const unitPackingCharge = Number(product.packingCharge ?? 20);

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isAvailable) {
          throw new BadRequestException(`Variant unavailable for ${product.name}`);
        }
        unitPrice = Number(variant.price);
        variantName = variant.name;
      }

      const totalPrice = unitPrice * item.quantity;
      const linePacking = unitPackingCharge * item.quantity;
      subtotal += totalPrice;
      packingCharge += linePacking;
      packedItemCount += item.quantity;

      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name,
        variantName,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        unitPackingCharge,
        packingCharge: linePacking,
      };
    });

    if (subtotal < minOrder) {
      throw new BadRequestException(`Minimum order amount is ₹${minOrder}`);
    }

    const { amount: deliveryCharge } = calculateDeliveryCharge(subtotal, {
      deliveryCharge: Number(settings?.deliveryCharge ?? 30),
      freeDeliveryLimit: Number(settings?.freeDeliveryLimit ?? 299),
      orderType: 'DELIVERY',
    });

    const preOrderConfig = {
      discountPct: Number(settings?.preOrderDiscountPct ?? 10),
      minDaysAhead: Number(settings?.preOrderMinDaysAhead ?? 1),
      stackWithCoupons: settings?.preOrderStackWithCoupons === true,
    };

    let preOrderDiscount = 0;
    if (
      data.scheduledDeliveryAt &&
      isPreOrderEligible(data.scheduledDeliveryAt, new Date(), preOrderConfig)
    ) {
      preOrderDiscount = calculatePreOrderDiscount(
        subtotal,
        data.scheduledDeliveryAt,
        preOrderConfig,
      );
    }

    let couponDiscount = 0;
    let couponId: string | undefined;
    const allowCoupon = preOrderConfig.stackWithCoupons || preOrderDiscount === 0;

    if (data.couponCode && allowCoupon) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: data.couponCode, isActive: true },
      });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (subtotal >= Number(coupon.minOrderAmount)) {
          if (coupon.type === 'PERCENTAGE') {
            couponDiscount = (subtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscount)
              couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
          } else {
            couponDiscount = Number(coupon.value);
          }
          couponDiscount = Math.min(couponDiscount, subtotal);
          couponId = coupon.id;
        }
      }
    }

    let rewardDiscount = 0;
    const rewardPointsUsed = data.rewardPointsUsed ?? 0;
    if (rewardPointsUsed > 0 && data.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
      if (!user) throw new BadRequestException('User not found');
      if (user.loyaltyPoints < rewardPointsUsed) {
        throw new BadRequestException('Insufficient reward points');
      }
      rewardDiscount = Math.min(
        rewardPointsUsed,
        subtotal + deliveryCharge + packingCharge - preOrderDiscount - couponDiscount,
      );
    }

    const totalDiscount = preOrderDiscount + couponDiscount + rewardDiscount;
    const grandTotal = Math.max(0, subtotal + deliveryCharge + packingCharge - totalDiscount);

    return {
      subtotal,
      deliveryCharge,
      packingCharge,
      packedItemCount,
      preOrderDiscount,
      couponDiscount,
      rewardDiscount,
      rewardPointsUsed: rewardDiscount > 0 ? rewardPointsUsed : 0,
      totalDiscount,
      grandTotal,
      couponId,
      minOrderAmount: minOrder,
      orderItems,
    };
  }

  async findAll(filters?: { status?: OrderStatus; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const where = filters?.status ? { status: filters.status } : {};

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, payment: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((order) => this.mapOrder(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        posTable: { select: { label: true } },
        emailNotifications: {
          where: { notificationType: 'ORDER_CONFIRMED' },
          take: 1,
        },
        statusHistory: {
          include: { updatedBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.mapOrder(order);
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.mapOrder(order);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    options?: {
      trackingStatus?: TrackingStatus;
      updatedById?: string;
      remarks?: string;
    },
  ) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status,
          ...(options?.trackingStatus ? { trackingStatus: options.trackingStatus } : {}),
          ...(status === OrderStatus.DELIVERED ? { paymentStatus: PaymentStatus.COMPLETED } : {}),
        },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          previousStatus: existing.status,
          newStatus: status,
          updatedById: options?.updatedById,
          remarks: options?.remarks,
        },
      });

      return updated;
    });

    if (status === OrderStatus.DELIVERED) {
      await this.prisma.payment.updateMany({
        where: { orderId: id },
        data: { status: PaymentStatus.COMPLETED },
      });
    }

    this.gateway.emitOrderUpdate(order.id, {
      status,
      trackingStatus: options?.trackingStatus,
      message: this.statusMessage(status),
    });
    return this.findOne(order.id);
  }

  async rejectOrder(id: string, reason: string, updatedById?: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Order not found');

      const updated = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED, rejectReason: reason },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          previousStatus: existing.status,
          newStatus: OrderStatus.CANCELLED,
          updatedById,
          remarks: reason,
        },
      });

      return updated;
    });

    this.gateway.emitOrderUpdate(order.id, {
      status: OrderStatus.CANCELLED,
      message: `Unfortunately your order was cancelled. Reason: ${reason}`,
    });
    return this.findOne(order.id);
  }

  private statusMessage(status: OrderStatus): string {
    const messages: Partial<Record<OrderStatus, string>> = {
      ACCEPTED: 'Your order has been accepted.',
      PREPARING: 'Your order is being prepared.',
      READY: 'Your order is ready for pickup.',
      OUT_FOR_DELIVERY: 'Your order is out for delivery.',
      DELIVERED: 'Your order has been delivered.',
      CANCELLED: 'Unfortunately your order was cancelled.',
    };
    return messages[status] || 'Your order status was updated.';
  }

  async confirmPayment(id: string) {
    await this.prisma.payment.updateMany({
      where: { orderId: id },
      data: { status: PaymentStatus.COMPLETED },
    });
    const order = await this.prisma.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.COMPLETED },
    });
    void this.orderEmailNotification.notifyOrderConfirmed(id);
    void this.notificationsService.notifyStaffNewOrder(id);
    return order;
  }

  async resendOrderEmail(id: string, userId?: string, userName?: string) {
    await this.orderEmailNotification.resendOrderConfirmed(id, userId, userName);
    return this.findOne(id);
  }

  private async generateOrderNumber(): Promise<string> {
    const settings = await this.prisma.businessSettings.findFirst();
    const now = new Date();
    const dateKey = parseInt(
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
      10,
    );
    const isSameDay = settings!.orderYear === dateKey;

    const updated = await this.prisma.businessSettings.update({
      where: { id: settings!.id },
      data: {
        orderSequence: isSameDay ? { increment: 1 } : 1,
        orderYear: dateKey,
      },
    });

    const dateStr = String(dateKey);
    const seq = updated.orderSequence;
    return `MDH-${dateStr}-${String(seq).padStart(6, '0')}`;
  }

  private mapOrder(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    trackingStatus: TrackingStatus | null;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    deliveryInstructions: string | null;
    rejectReason?: string | null;
    subtotal: { toNumber?: () => number } | number;
    deliveryCharge: { toNumber?: () => number } | number;
    packingCharge: { toNumber?: () => number } | number;
    packedItemCount?: number;
    preOrderDiscount?: { toNumber?: () => number } | number;
    discount: { toNumber?: () => number } | number;
    scheduledDeliveryAt?: Date | null;
    grandTotal: { toNumber?: () => number } | number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    items: {
      id: string;
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: { toNumber?: () => number } | number;
      totalPrice: { toNumber?: () => number } | number;
      unitPackingCharge?: { toNumber?: () => number } | number;
      packingCharge?: { toNumber?: () => number } | number;
    }[];
    statusHistory?: {
      id: string;
      previousStatus: OrderStatus | null;
      newStatus: OrderStatus;
      remarks: string | null;
      createdAt: Date;
      updatedBy?: { name: string | null } | null;
    }[];
    emailNotifications?: {
      status: import('@prisma/client').OrderEmailNotificationStatus;
      attemptCount: number;
      lastError: string | null;
      sentAt: Date | null;
      recipients: string[];
      updatedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    const toNum = (v: { toNumber?: () => number } | number) =>
      typeof v === 'number' ? v : Number(v);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingStatus: order.trackingStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress ?? '',
      deliveryInstructions: order.deliveryInstructions,
      rejectReason: order.rejectReason ?? null,
      subtotal: toNum(order.subtotal),
      deliveryCharge: toNum(order.deliveryCharge),
      packingCharge: toNum(order.packingCharge),
      packedItemCount: order.packedItemCount ?? 0,
      preOrderDiscount: toNum(order.preOrderDiscount ?? 0),
      discount: toNum(order.discount),
      scheduledDeliveryAt: order.scheduledDeliveryAt?.toISOString() ?? null,
      grandTotal: toNum(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        quantity: i.quantity,
        unitPrice: toNum(i.unitPrice),
        totalPrice: toNum(i.totalPrice),
        unitPackingCharge: toNum(i.unitPackingCharge ?? 0),
        packingCharge: toNum(i.packingCharge ?? 0),
      })),
      statusHistory: order.statusHistory?.map((h) => ({
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        updatedByName: h.updatedBy?.name ?? null,
        remarks: h.remarks,
        createdAt: h.createdAt.toISOString(),
      })),
      emailNotification: this.orderEmailNotification.mapNotification(
        order.emailNotifications?.[0] ?? null,
      ),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
