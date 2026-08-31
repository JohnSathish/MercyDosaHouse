import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ContentStatus,
  DeliveryAssignmentStatus,
  OrderStatus,
  OrderSource,
  PaymentMethod,
  PaymentStatus,
  TrackingStatus,
} from '@prisma/client';
import {
  calculateDeliveryCharge,
  isChickenBiryaniScheduleMatch,
  isChickenDumBiryaniProduct,
  CHICKEN_BIRYANI_VALIDATION_MESSAGE,
  isPreOrderEligible,
  isPromotionScheduleMatch,
  formatPromotionTime,
  toCalendarDayKey,
} from '@mdh/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { isValidOrderStatusTransition, getForwardStatusPath } from './order-status-transitions';
import { MarketingService } from '../marketing/marketing.service';
import { CouponsService } from '../coupons/coupons.service';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';
import { RequestUser } from '../../common/guards';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private orderEmailNotification: OrderEmailNotificationService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private marketingService: MarketingService,
    private couponsService: CouponsService,
    private jwt: JwtService,
    private email: EmailService,
    private sms: SmsService,
    private config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      this.redis.connect().catch(() => undefined);
    }
  }

  private redis: Redis | null = null;

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
      include: { items: true, payment: true, review: { select: { id: true } } },
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
    orderType?: 'DELIVERY' | 'ONLINE_PICKUP' | 'TAKEAWAY' | 'DINE_IN';
    orderSource?: 'WEBSITE' | 'ANDROID';
    customerPhone?: string;
  }) {
    await this.settingsService.assertAcceptingOnlineOrders();
    if (!data.items.length) throw new BadRequestException('Cart is empty');
    const pricing = await this.computePricing(data);
    return {
      subtotal: pricing.subtotal,
      deliveryCharge: pricing.deliveryCharge,
      packingCharge: pricing.packingCharge,
      packedItemCount: pricing.packedItemCount,
      couponDiscount: pricing.couponDiscount,
      discountAmount: pricing.couponDiscount,
      discountName: pricing.discountName,
      discountType: pricing.discountType,
      discountValue: pricing.discountValue,
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
    deliveryLandmark?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    deliveryInstructions?: string;
    paymentMethod: PaymentMethod;
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
    addressId?: string;
    scheduledDeliveryAt?: Date;
    rewardPointsUsed?: number;
    orderType?: 'DELIVERY' | 'ONLINE_PICKUP' | 'TAKEAWAY' | 'DINE_IN';
    orderSource?: 'WEBSITE' | 'ANDROID';
  }) {
    await this.settingsService.assertAcceptingOnlineOrders();
    if (!data.items.length) throw new BadRequestException('Order must have items');

    const orderType = data.orderType ?? 'DELIVERY';
    if (orderType === 'DELIVERY') {
      const hasLatitude = data.deliveryLatitude != null;
      const hasLongitude = data.deliveryLongitude != null;
      if (hasLatitude !== hasLongitude) {
        throw new BadRequestException('Both delivery latitude and longitude are required');
      }
      if (
        hasLatitude &&
        (data.deliveryLatitude! < -90 ||
          data.deliveryLatitude! > 90 ||
          data.deliveryLongitude! < -180 ||
          data.deliveryLongitude! > 180)
      ) {
        throw new BadRequestException('Invalid delivery coordinates');
      }
      const deliveryCheck = await this.marketingService.checkDeliveryArea(
        data.deliveryAddress,
        undefined,
        {
          latitude: data.deliveryLatitude,
          longitude: data.deliveryLongitude,
        },
      );
      if (!deliveryCheck.available) {
        throw new BadRequestException(
          deliveryCheck.message || 'We are not delivering to this location yet.',
        );
      }
    }
    const pricing = await this.computePricing({ ...data, orderType });
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
          deliveryLandmark: data.deliveryLandmark,
          deliveryLatitude: data.deliveryLatitude,
          deliveryLongitude: data.deliveryLongitude,
          addressId: data.addressId,
          scheduledDeliveryAt: data.scheduledDeliveryAt,
          rewardPointsUsed: pricing.rewardPointsUsed,
          deliveryInstructions: data.deliveryInstructions,
          orderType,
          orderSource: data.orderSource === 'ANDROID' ? OrderSource.ANDROID : OrderSource.WEBSITE,
          subtotal: pricing.subtotal,
          deliveryCharge: pricing.deliveryCharge,
          packingCharge: pricing.packingCharge,
          packedItemCount: pricing.packedItemCount,
          discount: pricing.totalDiscount,
          discountName: pricing.discountName,
          discountType: pricing.discountType,
          discountValue: pricing.discountValue,
          discountAmount: pricing.couponDiscount,
          grandTotal: pricing.grandTotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          couponId: pricing.couponId,
          discountId: pricing.couponId,
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
        const usageUpdate = await tx.coupon.updateMany({
          where: {
            id: pricing.couponId,
            ...(pricing.discountUsageLimit != null
              ? { usageCount: { lt: pricing.discountUsageLimit } }
              : {}),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (usageUpdate.count !== 1) {
          throw new BadRequestException('This discount is no longer available');
        }
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
    await this.notificationsService.notifyCustomerOrderPlaced(order.id);
    const mapped = await this.findOne(order.id);
    return { ...mapped, trackToken: this.signTrackToken(order.id, order.orderNumber) };
  }

  private async computePricing(data: {
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
    scheduledDeliveryAt?: Date;
    rewardPointsUsed?: number;
    orderType?: 'DELIVERY' | 'ONLINE_PICKUP' | 'TAKEAWAY' | 'DINE_IN';
    orderSource?: 'WEBSITE' | 'ANDROID';
    customerPhone?: string;
  }) {
    const settings = await this.prisma.businessSettings.findFirst();
    const minOrder = Number(settings?.minOrderAmount || 100);
    const orderType = data.orderType ?? 'DELIVERY';

    const productIds = data.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true, deletedAt: null },
      include: { variants: true },
    });

    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('Some products are unavailable');
    }

    const preOrderProducts = products.filter((product) => product.isPreOrder);
    const now = new Date();
    const chickenBiryaniProducts = products.filter((product) =>
      isChickenDumBiryaniProduct(product),
    );
    if (
      chickenBiryaniProducts.length > 0 &&
      !isChickenBiryaniScheduleMatch(data.scheduledDeliveryAt)
    ) {
      throw new BadRequestException(CHICKEN_BIRYANI_VALIDATION_MESSAGE);
    }
    if (
      preOrderProducts.some(
        () =>
          !data.scheduledDeliveryAt ||
          !isPreOrderEligible(data.scheduledDeliveryAt, now, {
            minDaysAhead: 1,
          }),
      )
    ) {
      throw new BadRequestException(
        'This pre-order item requires a scheduled delivery at least one day in advance.',
      );
    }

    const promotionProducts = preOrderProducts.filter(
      (product) => !isChickenDumBiryaniProduct(product),
    );
    const promotion = promotionProducts.length
      ? await this.prisma.announcement.findFirst({
          where: {
            promotionProductId: { in: promotionProducts.map((product) => product.id) },
            promotionPreOrderRequired: true,
            isActive: true,
            status: ContentStatus.PUBLISHED,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        })
      : null;

    if (promotion) {
      if (!data.scheduledDeliveryAt) {
        throw new BadRequestException(
          `Select the next available promotion day at ${formatPromotionTime(promotion.promotionReadyTime)}.`,
        );
      }
      if (
        promotion.promotionDayOfWeek == null ||
        !promotion.promotionReadyTime ||
        !isPromotionScheduleMatch(
          data.scheduledDeliveryAt,
          {
            dayOfWeek: promotion.promotionDayOfWeek,
            readyTime: promotion.promotionReadyTime,
            preOrderRequired: promotion.promotionPreOrderRequired,
            preOrderCutoffDay: promotion.promotionPreOrderCutoffDay,
          },
          now,
        )
      ) {
        throw new BadRequestException(
          `This promotion is available only on its configured day at ${promotion.promotionReadyTime ?? 'the configured time'}.`,
        );
      }
      if (promotion.promotionQuantityLimit != null) {
        const dateKey = toCalendarDayKey(data.scheduledDeliveryAt);
        const start = new Date(`${dateKey}T00:00:00+05:30`);
        const end = new Date(`${dateKey}T00:00:00+05:30`);
        end.setUTCDate(end.getUTCDate() + 1);
        const booked = await this.prisma.orderItem.aggregate({
          where: {
            productId: promotion.promotionProductId!,
            order: {
              status: { not: OrderStatus.CANCELLED },
              scheduledDeliveryAt: { gte: start, lt: end },
            },
          },
          _sum: { quantity: true },
        });
        const requested = data.items
          .filter((item) => item.productId === promotion.promotionProductId)
          .reduce((total, item) => total + item.quantity, 0);
        const remaining = promotion.promotionQuantityLimit - (booked._sum.quantity ?? 0);
        if (requested > remaining) {
          throw new BadRequestException(
            remaining > 0
              ? `Only ${remaining} promotion portions remain for this Sunday.`
              : 'This Sunday promotion is sold out. Please choose the next available Sunday.',
          );
        }
      }
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
      orderType,
    });

    const discountResult = await this.couponsService.calculate(
      data.couponCode,
      subtotal,
      data.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const line = orderItems.find(
          (candidate) =>
            candidate.productId === item.productId && candidate.variantId === item.variantId,
        );
        return {
          productId: item.productId,
          categoryId: product.categoryId,
          totalPrice: line?.totalPrice ?? 0,
        };
      }),
      data.userId,
      data.orderSource === 'ANDROID' ? 'ANDROID' : 'WEBSITE',
      data.customerPhone,
    );
    const couponDiscount = discountResult?.amount ?? 0;
    const couponId = discountResult?.discount.id;
    const discountName = discountResult?.discount.name ?? null;
    const discountType = discountResult?.discount.type ?? null;
    const discountValue = discountResult ? Number(discountResult.discount.value) : null;
    const discountUsageLimit = discountResult?.discount.usageLimit ?? null;

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
        subtotal + deliveryCharge + packingCharge - couponDiscount,
      );
    }

    const totalDiscount = couponDiscount + rewardDiscount;
    const grandTotal = Math.max(0, subtotal + deliveryCharge + packingCharge - totalDiscount);

    return {
      subtotal,
      deliveryCharge,
      packingCharge,
      packedItemCount,
      couponDiscount,
      discountName,
      discountType,
      discountValue,
      discountUsageLimit,
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

  async findByOrderNumber(
    orderNumber: string,
    access?: { user?: RequestUser; trackToken?: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        statusHistory: {
          include: { updatedBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!(await this.canViewTrackedOrder(order, access))) {
      return this.lockedTrackPayload(order);
    }
    const settings = await this.prisma.businessSettings.findFirst({
      select: { estimatedDeliveryMinutes: true },
    });
    return {
      ...this.mapOrder(order),
      estimatedDeliveryMinutes: settings?.estimatedDeliveryMinutes ?? 30,
      trackToken: this.signTrackToken(order.id, order.orderNumber),
    };
  }

  async requestTrackOtp(orderNumber: string, phone: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { user: { select: { email: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertPhoneMatches(order.customerPhone, phone);

    if (!this.redis) {
      return {
        sent: true,
        channel: 'DELIVERY_CODE' as const,
        destination: this.maskPhone(order.customerPhone),
        hint: 'Enter the 4-digit delivery code from your order confirmation.',
      };
    }

    const cooldownKey = `track-otp:cooldown:${orderNumber}`;
    if (this.redis) {
      const wait = await this.redis.ttl(cooldownKey);
      if (wait > 0) {
        throw new BadRequestException(
          `Please wait ${wait} seconds before requesting another code.`,
        );
      }
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    if (this.redis) {
      await this.redis.setex(`track-otp:${orderNumber}`, 600, this.hashOtp(otp));
      await this.redis.setex(cooldownKey, 60, '1');
    }

    const sms = await this.sms.sendOtp(order.customerPhone, otp);
    if (sms.sent) {
      return {
        sent: true,
        channel: 'SMS' as const,
        destination: this.maskPhone(order.customerPhone),
      };
    }

    const emailTo = order.user?.email;
    if (emailTo && this.email.isConfigured()) {
      await this.email.send({
        to: emailTo,
        subject: `Your Mercy Dosa House tracking code for ${order.orderNumber}`,
        text: `Your order tracking code is ${otp}. It expires in 10 minutes. Do not share this code.`,
      });
      return { sent: true, channel: 'EMAIL' as const, destination: this.maskEmail(emailTo) };
    }

    return {
      sent: true,
      channel: 'DELIVERY_CODE' as const,
      destination: this.maskPhone(order.customerPhone),
      hint: 'Enter the 4-digit delivery code from your order confirmation.',
    };
  }

  async verifyTrackOtp(orderNumber: string, phone: string, otp: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        statusHistory: {
          include: { updatedBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertPhoneMatches(order.customerPhone, phone);

    const code = otp.replace(/\D/g, '');
    let ok = false;
    if (this.redis) {
      const stored = await this.redis.get(`track-otp:${orderNumber}`);
      if (stored && this.verifyOtpHash(code, stored)) ok = true;
    }
    if (!ok && order.deliveryOtp && code === order.deliveryOtp) ok = true;
    if (!ok) throw new ForbiddenException('Invalid verification code');

    if (this.redis) await this.redis.del(`track-otp:${orderNumber}`);

    const settings = await this.prisma.businessSettings.findFirst({
      select: { estimatedDeliveryMinutes: true },
    });
    return {
      ...this.mapOrder(order),
      estimatedDeliveryMinutes: settings?.estimatedDeliveryMinutes ?? 30,
      trackToken: this.signTrackToken(order.id, order.orderNumber),
    };
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
    if (existing.status === status) {
      return this.findOne(id);
    }
    if (!isValidOrderStatusTransition(existing.status, status)) {
      const path = getForwardStatusPath(existing.status, status);
      if (!path?.length) {
        throw new BadRequestException(`Cannot move order from ${existing.status} to ${status}`);
      }
      let last = await this.findOne(id);
      for (const hop of path) {
        last = await this.updateStatus(id, hop, {
          ...options,
          trackingStatus: hop === status ? options?.trackingStatus : undefined,
        });
      }
      return last;
    }
    const trackingStatus = this.safeTrackingStatus(status, options?.trackingStatus);
    if (status === OrderStatus.OUT_FOR_DELIVERY && existing.orderType === 'DELIVERY') {
      const assignment = await this.prisma.deliveryTracking.findUnique({
        where: { orderId: id },
        select: { deliveryStaffId: true },
      });
      if (!assignment) {
        await this.prisma.deliveryTracking.create({
          data: { orderId: id, status: DeliveryAssignmentStatus.WAITING },
        });
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id, status: existing.status },
        data: {
          status,
          ...(trackingStatus ? { trackingStatus } : {}),
          ...(status === OrderStatus.DELIVERED ? { paymentStatus: PaymentStatus.COMPLETED } : {}),
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Order status changed by another operator. Refresh and try again.',
        );
      }

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
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

      if (
        status === OrderStatus.OUT_FOR_DELIVERY ||
        status === OrderStatus.DELIVERED ||
        status === OrderStatus.CANCELLED
      ) {
        await tx.deliveryTracking.updateMany({
          where: { orderId: id },
          data: {
            ...(status === OrderStatus.OUT_FOR_DELIVERY
              ? {
                  status: DeliveryAssignmentStatus.OUT_FOR_DELIVERY,
                  outForDeliveryAt: new Date(),
                  locationSharingActive: true,
                }
              : {
                  locationSharingActive: false,
                  ...(status === OrderStatus.DELIVERED
                    ? { status: DeliveryAssignmentStatus.DELIVERED, deliveredAt: new Date() }
                    : { status: DeliveryAssignmentStatus.CANCELLED }),
                }),
          },
        });
      }

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
    await this.notificationsService.notifyCustomerStatus(id, status, {
      previousStatus: existing.status,
      reason: options?.remarks,
    });
    return this.findOne(order.id);
  }

  async rejectOrder(id: string, reason: string, updatedById?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Order not found');
      if (existing.status === OrderStatus.CANCELLED) {
        return { order: existing, previousStatus: null };
      }
      if (!isValidOrderStatusTransition(existing.status, OrderStatus.CANCELLED)) {
        throw new BadRequestException(`Cannot cancel order from ${existing.status}`);
      }

      const claimed = await tx.order.updateMany({
        where: { id, status: existing.status },
        data: { status: OrderStatus.CANCELLED, rejectReason: reason },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Order status changed by another operator. Refresh and try again.',
        );
      }

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
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
      await tx.deliveryTracking.updateMany({
        where: { orderId: id },
        data: {
          status: DeliveryAssignmentStatus.CANCELLED,
          locationSharingActive: false,
        },
      });

      return { order: updated, previousStatus: existing.status };
    });
    const order = result.order;

    this.gateway.emitOrderUpdate(order.id, {
      status: OrderStatus.CANCELLED,
      message: `Unfortunately your order was cancelled. Reason: ${reason}`,
    });
    if (result.previousStatus) {
      await this.notificationsService.notifyCustomerStatus(id, OrderStatus.CANCELLED, {
        previousStatus: result.previousStatus,
        reason,
      });
    }
    return this.findOne(order.id);
  }

  private safeTrackingStatus(
    status: OrderStatus,
    requested?: TrackingStatus,
  ): TrackingStatus | undefined {
    const allowed = new Set<string>(Object.values(TrackingStatus));
    if (requested && allowed.has(requested)) return requested;
    if (status === OrderStatus.ACCEPTED) return TrackingStatus.ACCEPTED;
    if (status === OrderStatus.PREPARING) return TrackingStatus.COOKING;
    if (status === OrderStatus.READY) return TrackingStatus.PACKING;
    if (status === OrderStatus.OUT_FOR_DELIVERY) return TrackingStatus.OUT_FOR_DELIVERY;
    if (status === OrderStatus.DELIVERED) return TrackingStatus.DELIVERED;
    return undefined;
  }

  private statusMessage(status: OrderStatus): string {
    const messages: Partial<Record<OrderStatus, string>> = {
      PENDING: "We've received your order. Thank you for ordering from Mercy Dosa House!",
      ACCEPTED: 'Your order has been confirmed and will be prepared shortly.',
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

  private signTrackToken(orderId: string, orderNumber: string) {
    return this.jwt.sign({ typ: 'order-track', orderId, orderNumber }, { expiresIn: '7d' });
  }

  private readTrackToken(token?: string): { orderId: string; orderNumber: string } | null {
    if (!token?.trim()) return null;
    try {
      const payload = this.jwt.verify<{ typ?: string; orderId?: string; orderNumber?: string }>(
        token,
      );
      if (payload.typ !== 'order-track' || !payload.orderId || !payload.orderNumber) return null;
      return { orderId: payload.orderId, orderNumber: payload.orderNumber };
    } catch {
      return null;
    }
  }

  private async canViewTrackedOrder(
    order: { id: string; orderNumber: string; userId?: string | null },
    access?: { user?: RequestUser; trackToken?: string },
  ) {
    const token = this.readTrackToken(access?.trackToken);
    if (token && token.orderId === order.id && token.orderNumber === order.orderNumber) return true;
    const user = access?.user;
    if (!user) return false;
    if (
      user.isSuperAdmin ||
      user.permissions?.includes('orders.read') ||
      user.permissions?.includes('*')
    ) {
      return true;
    }
    return Boolean(order.userId && order.userId === user.id);
  }

  private lockedTrackPayload(order: {
    orderNumber: string;
    customerPhone: string;
    status: OrderStatus;
  }) {
    return {
      locked: true as const,
      orderNumber: order.orderNumber,
      status: order.status,
      customerPhone: this.maskPhone(order.customerPhone),
      customerName: '',
      deliveryAddress: '',
      items: [],
      subtotal: 0,
      deliveryCharge: 0,
      packingCharge: 0,
      discount: 0,
      grandTotal: 0,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      id: '',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  private digits(phone: string) {
    return phone.replace(/\D/g, '').slice(-10);
  }

  private assertPhoneMatches(stored: string, provided: string) {
    if (this.digits(stored) !== this.digits(provided || '')) {
      throw new ForbiddenException('Phone number does not match this order');
    }
  }

  private maskPhone(phone: string) {
    const d = this.digits(phone);
    if (d.length < 4) return '****';
    return `******${d.slice(-4)}`;
  }

  private maskEmail(email: string) {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    return `${user.slice(0, 1)}***@${domain}`;
  }

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }

  private verifyOtpHash(otp: string, hash: string) {
    const computed = Buffer.from(this.hashOtp(otp));
    const stored = Buffer.from(hash);
    return computed.length === stored.length && timingSafeEqual(computed, stored);
  }

  private mapOrder(order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    trackingStatus: TrackingStatus | null;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    deliveryLandmark?: string | null;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    deliveryInstructions: string | null;
    rejectReason?: string | null;
    subtotal: { toNumber?: () => number } | number;
    deliveryCharge: { toNumber?: () => number } | number;
    packingCharge: { toNumber?: () => number } | number;
    packedItemCount?: number;
    discount: { toNumber?: () => number } | number;
    discountName?: string | null;
    discountType?: import('@prisma/client').CouponType | null;
    discountValue?: { toNumber?: () => number } | number | null;
    discountAmount?: { toNumber?: () => number } | number | null;
    scheduledDeliveryAt?: Date | null;
    grandTotal: { toNumber?: () => number } | number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    couponId?: string | null;
    discountId?: string | null;
    orderType?: string;
    userId?: string | null;
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
    review?: { id: string } | null;
  }) {
    const toNum = (v: { toNumber?: () => number } | number) =>
      typeof v === 'number' ? v : Number(v);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingStatus: order.trackingStatus,
      orderType: order.orderType,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress ?? '',
      deliveryLandmark: order.deliveryLandmark ?? null,
      deliveryLatitude: order.deliveryLatitude ?? null,
      deliveryLongitude: order.deliveryLongitude ?? null,
      deliveryInstructions: order.deliveryInstructions,
      rejectReason: order.rejectReason ?? null,
      subtotal: toNum(order.subtotal),
      deliveryCharge: toNum(order.deliveryCharge),
      packingCharge: toNum(order.packingCharge),
      packedItemCount: order.packedItemCount ?? 0,
      discount: toNum(order.discount),
      discountId: order.discountId ?? order.couponId ?? null,
      discountName: order.discountName ?? null,
      discountType: order.discountType ?? null,
      discountValue: order.discountValue == null ? null : toNum(order.discountValue),
      discountAmount: order.discountAmount == null ? null : toNum(order.discountAmount),
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
      statusMessage: this.statusMessage(order.status),
      reviewId: order.review?.id ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
