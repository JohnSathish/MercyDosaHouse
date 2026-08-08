import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus, TrackingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
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

  async create(data: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    paymentMethod: PaymentMethod;
    items: { productId: string; variantId?: string; quantity: number }[];
    userId?: string;
    couponCode?: string;
  }) {
    if (!data.items.length) throw new BadRequestException('Order must have items');

    const settings = await this.prisma.businessSettings.findFirst();
    const deliveryCharge = Number(settings?.deliveryCharge || 30);
    const packingCharge = Number(settings?.packingCharge || 10);
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
    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      let unitPrice = Number(product.price);
      let variantName: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isAvailable) {
          throw new BadRequestException(`Variant unavailable for ${product.name}`);
        }
        unitPrice = Number(variant.price);
        variantName = variant.name;
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name,
        variantName,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    if (subtotal < minOrder) {
      throw new BadRequestException(`Minimum order amount is ₹${minOrder}`);
    }

    let discount = 0;
    let couponId: string | undefined;

    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: data.couponCode, isActive: true },
      });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        if (subtotal >= Number(coupon.minOrderAmount)) {
          if (coupon.type === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
          } else {
            discount = Number(coupon.value);
          }
          couponId = coupon.id;
        }
      }
    }

    const grandTotal = subtotal + deliveryCharge + packingCharge - discount;
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
          deliveryInstructions: data.deliveryInstructions,
          subtotal,
          deliveryCharge,
          packingCharge,
          discount,
          grandTotal,
          paymentMethod: data.paymentMethod,
          paymentStatus:
            data.paymentMethod === PaymentMethod.COD
              ? PaymentStatus.PENDING
              : PaymentStatus.PENDING,
          couponId,
          deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
          items: { create: orderItems },
        },
        include: { items: true, payment: true },
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          method: data.paymentMethod,
          status: PaymentStatus.PENDING,
          amount: grandTotal,
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
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

    this.gateway.emitNewOrder(order);
    return this.findOne(order.id);
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
      data: data.map(this.mapOrder),
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
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.COMPLETED },
    });
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
    deliveryAddress: string;
    deliveryInstructions: string | null;
    rejectReason?: string | null;
    subtotal: { toNumber?: () => number } | number;
    deliveryCharge: { toNumber?: () => number } | number;
    packingCharge: { toNumber?: () => number } | number;
    discount: { toNumber?: () => number } | number;
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
    }[];
    statusHistory?: {
      id: string;
      previousStatus: OrderStatus | null;
      newStatus: OrderStatus;
      remarks: string | null;
      createdAt: Date;
      updatedBy?: { name: string | null } | null;
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
      deliveryAddress: order.deliveryAddress,
      deliveryInstructions: order.deliveryInstructions,
      rejectReason: order.rejectReason ?? null,
      subtotal: toNum(order.subtotal),
      deliveryCharge: toNum(order.deliveryCharge),
      packingCharge: toNum(order.packingCharge),
      discount: toNum(order.discount),
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
      })),
      statusHistory: order.statusHistory?.map((h) => ({
        id: h.id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        updatedByName: h.updatedBy?.name ?? null,
        remarks: h.remarks,
        createdAt: h.createdAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
