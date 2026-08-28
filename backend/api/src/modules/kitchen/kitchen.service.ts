import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  TrackingStatus,
  KitchenPriority,
  KitchenItemStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isValidOrderStatusTransition } from '../orders/order-status-transitions';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

const orderInclude = {
  items: {
    include: {
      product: {
        include: {
          category: {
            include: { kitchenStation: true },
          },
        },
      },
    },
  },
  posTable: { select: { label: true } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private inventoryService: InventoryService,
    private notifications: NotificationsService,
  ) {}

  private mapOrder(order: OrderWithItems) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingStatus: order.trackingStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryInstructions: order.deliveryInstructions,
      subtotal: Number(order.subtotal),
      deliveryCharge: Number(order.deliveryCharge),
      packingCharge: Number(order.packingCharge),
      discount: Number(order.discount),
      grandTotal: Number(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      rejectReason: order.rejectReason,
      tokenNumber: order.tokenNumber,
      priority: order.priority,
      kitchenStartedAt: order.kitchenStartedAt?.toISOString() ?? null,
      kitchenCompletedAt: order.kitchenCompletedAt?.toISOString() ?? null,
      queuePosition: order.queuePosition,
      orderType: order.orderType,
      tableLabel: order.posTable?.label ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        kitchenStatus: item.kitchenStatus,
        specialInstructions: item.specialInstructions,
        stationSlug: item.product?.category?.kitchenStation?.slug ?? null,
        stationName: item.product?.category?.kitchenStation?.name ?? null,
      })),
    };
  }

  async getStations() {
    return this.prisma.kitchenStation.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getDashboard(query: {
    status?: string;
    station?: string;
    search?: string;
    priority?: KitchenPriority;
  }) {
    const where: Prisma.OrderWhereInput = {};

    if (query.status === 'new') {
      where.status = OrderStatus.PENDING;
    } else if (query.status === 'preparing') {
      where.status = { in: [OrderStatus.ACCEPTED, OrderStatus.PREPARING] };
    } else if (query.status === 'ready') {
      where.status = OrderStatus.READY;
      where.kitchenCompletedAt = null;
    } else if (query.status === 'completed') {
      where.kitchenCompletedAt = { not: null };
    } else {
      where.status = { in: ACTIVE_STATUSES };
    }

    if (query.priority) where.priority = query.priority;

    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: [{ queuePosition: 'asc' }, { createdAt: 'asc' }],
    });

    let filtered = orders.map((o) => this.mapOrder(o));

    if (query.station && query.station !== 'all') {
      filtered = filtered.filter((o) => o.items.some((i) => i.stationSlug === query.station));
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [completedToday, activeOrdersCount, preparingCount, readyCount, completedOrders] =
      await Promise.all([
        this.prisma.order.count({
          where: { kitchenCompletedAt: { gte: todayStart } },
        }),
        this.prisma.order.count({
          where: {
            status: {
              in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING],
            },
          },
        }),
        this.prisma.order.count({ where: { status: OrderStatus.PREPARING } }),
        this.prisma.order.count({
          where: { status: OrderStatus.READY, kitchenCompletedAt: null },
        }),
        this.prisma.order.findMany({
          where: { kitchenCompletedAt: { gte: todayStart } },
          select: { kitchenStartedAt: true, kitchenCompletedAt: true },
        }),
      ]);

    let avgPrepMinutes = 0;
    const prepTimes = completedOrders
      .filter((o) => o.kitchenStartedAt && o.kitchenCompletedAt)
      .map((o) => (o.kitchenCompletedAt!.getTime() - o.kitchenStartedAt!.getTime()) / 60000);
    if (prepTimes.length) {
      avgPrepMinutes = Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length);
    }

    const overdueThreshold = 20;
    const now = Date.now();
    const overdue = filtered.filter((o) => {
      const start = o.kitchenStartedAt
        ? new Date(o.kitchenStartedAt).getTime()
        : new Date(o.createdAt).getTime();
      const mins = (now - start) / 60000;
      return mins > overdueThreshold && o.status !== OrderStatus.READY;
    }).length;

    return {
      stats: {
        activeOrders: activeOrdersCount,
        preparing: preparingCount,
        ready: readyCount,
        completedToday,
        avgPrepMinutes,
        overdue,
      },
      orders: filtered,
    };
  }

  getIncomingOrders() {
    return this.getDashboard({ status: 'all' }).then((r) => r.orders);
  }

  private async logAction(
    orderId: string,
    action: string,
    userId?: string,
    stationId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.kitchenLog.create({
      data: {
        orderId,
        action,
        performedById: userId,
        stationId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async writeStatusHistory(
    orderId: string,
    previousStatus: OrderStatus | null,
    newStatus: OrderStatus,
    userId?: string,
    remarks?: string,
  ) {
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus,
        newStatus,
        updatedById: userId,
        remarks,
      },
    });
  }

  private async nextTokenNumber(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await this.prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    });
    return count + 1;
  }

  async acceptOrder(id: string, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');
    if (existing.status === OrderStatus.ACCEPTED) {
      const current = await this.prisma.order.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
      return this.mapOrder(current);
    }
    if (!isValidOrderStatusTransition(existing.status, OrderStatus.ACCEPTED)) {
      throw new BadRequestException(`Cannot move order from ${existing.status} to ACCEPTED`);
    }

    const tokenNumber = existing.tokenNumber ?? (await this.nextTokenNumber());

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.ACCEPTED,
        trackingStatus: TrackingStatus.ACCEPTED,
        tokenNumber,
      },
      include: orderInclude,
    });

    await this.writeStatusHistory(
      id,
      existing.status,
      OrderStatus.ACCEPTED,
      userId,
      'Kitchen accepted',
    );
    await this.logAction(id, 'ACCEPTED', userId);

    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.ACCEPTED,
      trackingStatus: TrackingStatus.ACCEPTED,
    });
    void this.notifications.notifyCustomerStatus(id, OrderStatus.ACCEPTED, {
      previousStatus: existing.status,
    });

    return this.mapOrder(order);
  }

  async rejectOrder(id: string, reason?: string, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

    const order = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, rejectReason: reason ?? 'Rejected by kitchen' },
      include: orderInclude,
    });

    await this.writeStatusHistory(id, existing.status, OrderStatus.CANCELLED, userId, reason);
    await this.logAction(id, 'REJECTED', userId, undefined, { reason });

    this.gateway.emitOrderUpdate(id, { status: OrderStatus.CANCELLED });
    if (existing.status !== OrderStatus.CANCELLED) {
      void this.notifications.notifyCustomerStatus(id, OrderStatus.CANCELLED, {
        previousStatus: existing.status,
        reason: reason ?? 'Rejected by kitchen',
      });
    }
    return this.mapOrder(order);
  }

  async markPreparing(
    id: string,
    userId?: string,
    trackingStatus: TrackingStatus = TrackingStatus.PREPARING,
  ) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.PREPARING,
        trackingStatus,
        kitchenStartedAt: existing.kitchenStartedAt ?? new Date(),
      },
      include: orderInclude,
    });

    await this.writeStatusHistory(id, existing.status, OrderStatus.PREPARING, userId);
    await this.logAction(id, 'PREPARING', userId);

    // Auto-deduct recipe ingredients from inventory
    await this.inventoryService.deductForOrder(id).catch(() => undefined);

    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.PREPARING,
      trackingStatus,
    });
    if (existing.status !== OrderStatus.PREPARING) {
      void this.notifications.notifyCustomerStatus(id, OrderStatus.PREPARING, {
        previousStatus: existing.status,
      });
    }

    return this.mapOrder(order);
  }

  async markReady(id: string, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

    await this.prisma.orderItem.updateMany({
      where: { orderId: id },
      data: { kitchenStatus: KitchenItemStatus.READY },
    });

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.READY,
        trackingStatus: TrackingStatus.PACKING,
      },
      include: orderInclude,
    });

    await this.writeStatusHistory(id, existing.status, OrderStatus.READY, userId);
    await this.logAction(id, 'READY', userId);

    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.READY,
      trackingStatus: TrackingStatus.PACKING,
    });
    if (existing.status !== OrderStatus.READY) {
      void this.notifications.notifyCustomerStatus(id, OrderStatus.READY, {
        previousStatus: existing.status,
      });
    }

    return this.mapOrder(order);
  }

  async markComplete(id: string, userId?: string) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Order not found');

    const order = await this.prisma.order.update({
      where: { id },
      data: { kitchenCompletedAt: new Date() },
      include: orderInclude,
    });

    await this.logAction(id, 'COMPLETED', userId);

    this.gateway.emitOrderUpdate(id, {
      status: order.status,
      message: 'Kitchen completed',
    });

    return this.mapOrder(order);
  }

  async updateItemStatus(
    orderId: string,
    itemId: string,
    kitchenStatus: KitchenItemStatus,
    userId?: string,
  ) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    });
    if (!item) throw new NotFoundException('Order item not found');

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { kitchenStatus },
    });

    await this.logAction(orderId, 'ITEM_STATUS', userId, undefined, {
      itemId,
      kitchenStatus,
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    this.gateway.emitOrderUpdate(orderId, { status: order!.status, message: 'Item updated' });
    return this.mapOrder(order!);
  }

  async reorderQueue(orderIds: string[]) {
    await Promise.all(
      orderIds.map((id, index) =>
        this.prisma.order.update({
          where: { id },
          data: { queuePosition: index },
        }),
      ),
    );
    return { success: true };
  }

  async getLogs(orderId: string) {
    return this.prisma.kitchenLog.findMany({
      where: { orderId },
      include: { performedBy: { select: { id: true, name: true } }, station: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
