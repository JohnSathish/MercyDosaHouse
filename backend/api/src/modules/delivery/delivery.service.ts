import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  TrackingStatus,
  DeliveryAssignmentStatus,
  DeliveryExecutiveStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';

const orderInclude = {
  items: true,
  deliveryTracking: {
    include: {
      deliveryStaff: { include: { user: true } },
      zone: true,
      proof: true,
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private notifications: NotificationsService,
  ) {}

  private num(v: Prisma.Decimal | number | null | undefined): number {
    if (v == null) return 0;
    return Number(v);
  }

  private mapOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
    const tracking = order.deliveryTracking;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingStatus: order.trackingStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryInstructions: order.deliveryInstructions,
      deliveryOtp: order.deliveryOtp,
      grandTotal: this.num(order.grandTotal),
      deliveryCharge: this.num(order.deliveryCharge),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
      })),
      assignment: tracking
        ? {
            id: tracking.id,
            status: tracking.status,
            etaMinutes: tracking.etaMinutes,
            distanceKm: tracking.distanceKm ? this.num(tracking.distanceKm) : null,
            assignedAt: tracking.assignedAt?.toISOString() ?? null,
            pickedUpAt: tracking.pickedUpAt?.toISOString() ?? null,
            outForDeliveryAt: tracking.outForDeliveryAt?.toISOString() ?? null,
            deliveredAt: tracking.deliveredAt?.toISOString() ?? null,
            latitude: tracking.latitude,
            longitude: tracking.longitude,
            deliveryNotes: tracking.deliveryNotes,
            executive: tracking.deliveryStaff
              ? {
                  id: tracking.deliveryStaff.id,
                  employeeId: tracking.deliveryStaff.employeeId,
                  name: tracking.deliveryStaff.user?.name,
                  phone: tracking.deliveryStaff.user?.phone,
                  vehicleType: tracking.deliveryStaff.vehicleType,
                  vehicleNumber: tracking.deliveryStaff.vehicleNumber,
                  rating: this.num(tracking.deliveryStaff.rating),
                  status: tracking.deliveryStaff.status,
                }
              : null,
            zone: tracking.zone
              ? { name: tracking.zone.name, charge: this.num(tracking.zone.charge) }
              : null,
          }
        : null,
    };
  }

  private async logDelivery(
    orderId: string,
    action: string,
    description: string,
    trackingId?: string,
    deliveryStaffId?: string,
    userId?: string,
  ) {
    await this.prisma.deliveryLog.create({
      data: { orderId, action, description, trackingId, deliveryStaffId, userId },
    });
  }

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      waiting,
      assigned,
      pickedUp,
      onTheWay,
      deliveredToday,
      cancelledToday,
      executives,
      recentDeliveries,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.READY, deliveryTracking: null } }),
      this.prisma.deliveryTracking.count({ where: { status: DeliveryAssignmentStatus.ASSIGNED } }),
      this.prisma.deliveryTracking.count({ where: { status: DeliveryAssignmentStatus.PICKED_UP } }),
      this.prisma.deliveryTracking.count({
        where: { status: DeliveryAssignmentStatus.OUT_FOR_DELIVERY },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.DELIVERED, updatedAt: { gte: todayStart } },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.CANCELLED, updatedAt: { gte: todayStart } },
      }),
      this.prisma.deliveryStaff.findMany({
        where: { isActive: true },
        include: { user: true },
        orderBy: { totalDeliveries: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { status: OrderStatus.DELIVERED, updatedAt: { gte: todayStart } },
        include: orderInclude,
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const deliveredOrders = await this.prisma.deliveryTracking.findMany({
      where: { deliveredAt: { gte: todayStart } },
      select: { assignedAt: true, deliveredAt: true },
    });

    let avgMinutes = 27;
    const times = deliveredOrders
      .filter((t) => t.assignedAt && t.deliveredAt)
      .map((t) => (t.deliveredAt!.getTime() - t.assignedAt!.getTime()) / 60000);
    if (times.length) avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

    const revenueResult = await this.prisma.order.aggregate({
      where: { status: OrderStatus.DELIVERED, updatedAt: { gte: todayStart } },
      _sum: { grandTotal: true },
    });

    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] },
      },
      include: orderInclude,
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const onlineRiders = executives.filter(
      (e) =>
        e.status === DeliveryExecutiveStatus.ONLINE || e.status === DeliveryExecutiveStatus.BUSY,
    );

    return {
      stats: {
        waiting,
        assigned,
        pickedUp,
        onTheWay,
        deliveredToday,
        cancelledToday,
        avgDeliveryMinutes: avgMinutes,
        deliveryRevenue: Math.round(this.num(revenueResult._sum.grandTotal)),
        onlineRiders: onlineRiders.length,
      },
      executives: executives.slice(0, 5).map((e) => ({
        id: e.id,
        employeeId: e.employeeId,
        name: e.user?.name ?? 'Rider',
        phone: e.user?.phone,
        rating: this.num(e.rating),
        status: e.status,
        activeOrders: e.activeOrders,
        totalDeliveries: e.totalDeliveries,
        todayEarnings: this.num(e.todayEarnings),
        vehicleNumber: e.vehicleNumber,
        currentLat: e.currentLat,
        currentLng: e.currentLng,
      })),
      pendingOrders: pendingOrders.map((o) => this.mapOrder(o)),
      recentDeliveries: recentDeliveries.map((o) => this.mapOrder(o)),
      liveRiders: onlineRiders.map((e) => ({
        id: e.id,
        name: e.user?.name,
        lat: e.currentLat,
        lng: e.currentLng,
        status: e.status,
      })),
    };
  }

  async listOrders(query: { status?: string; search?: string }) {
    const where: Prisma.OrderWhereInput = {
      status: {
        in: [
          OrderStatus.READY,
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ],
      },
    };

    if (query.status === 'waiting') {
      where.status = OrderStatus.READY;
      where.deliveryTracking = null;
    } else if (query.status === 'assigned') {
      where.deliveryTracking = { status: DeliveryAssignmentStatus.ASSIGNED };
    } else if (query.status === 'picked_up') {
      where.deliveryTracking = { status: DeliveryAssignmentStatus.PICKED_UP };
    } else if (query.status === 'on_the_way') {
      where.deliveryTracking = { status: DeliveryAssignmentStatus.OUT_FOR_DELIVERY };
    } else if (query.status === 'delivered') {
      where.status = OrderStatus.DELIVERED;
    }

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
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders.map((o) => this.mapOrder(o));
  }

  getAssignedOrders(staffUserId: string) {
    return this.prisma.order
      .findMany({
        where: {
          deliveryTracking: { deliveryStaff: { userId: staffUserId } },
          status: { in: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] },
        },
        include: orderInclude,
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map((o) => this.mapOrder(o)));
  }

  getAvailableOrders() {
    return this.prisma.order
      .findMany({
        where: { status: OrderStatus.READY, deliveryTracking: null },
        include: orderInclude,
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map((o) => this.mapOrder(o)));
  }

  async listExecutives() {
    const rows = await this.prisma.deliveryStaff.findMany({
      where: { isActive: true },
      include: { user: true, _count: { select: { tracking: true } } },
      orderBy: { totalDeliveries: 'desc' },
    });
    return rows.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      photoUrl: e.photoUrl,
      vehicleType: e.vehicleType,
      vehicleNumber: e.vehicleNumber,
      licenseNumber: e.licenseNumber,
      joiningDate: e.joiningDate?.toISOString() ?? null,
      rating: this.num(e.rating),
      status: e.status,
      activeOrders: e.activeOrders,
      totalDeliveries: e.totalDeliveries,
      todayEarnings: this.num(e.todayEarnings),
      currentLat: e.currentLat,
      currentLng: e.currentLng,
      isActive: e.isActive,
      user: e.user ? { name: e.user.name, phone: e.user.phone, email: e.user.email } : undefined,
      _count: e._count,
    }));
  }

  async listZones() {
    const rows = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((z) => ({
      ...z,
      minKm: this.num(z.minKm),
      maxKm: this.num(z.maxKm),
      charge: this.num(z.charge),
    }));
  }

  async assignOrderByUserId(orderId: string, staffUserId: string, actorUserId?: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { userId: staffUserId } });
    if (!staff) throw new BadRequestException('Delivery executive profile not found');
    return this.assignOrder(orderId, staff.id, actorUserId ?? staffUserId);
  }

  async assignOrder(orderId: string, staffId: string, userId?: string, auto = false) {
    const staff = await this.prisma.deliveryStaff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });
    if (!staff) throw new BadRequestException('Delivery executive not found');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order must be READY for pickup');
    }

    const etaMinutes = 25 + Math.floor(Math.random() * 15);
    const distanceKm = 2 + Math.random() * 6;

    const tracking = await this.prisma.deliveryTracking.upsert({
      where: { orderId },
      update: {
        deliveryStaffId: staff.id,
        status: DeliveryAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        etaMinutes,
        distanceKm,
      },
      create: {
        orderId,
        deliveryStaffId: staff.id,
        status: DeliveryAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        etaMinutes,
        distanceKm,
      },
    });

    await this.prisma.deliveryStaff.update({
      where: { id: staff.id },
      data: {
        activeOrders: { increment: 1 },
        status: DeliveryExecutiveStatus.BUSY,
      },
    });

    await this.logDelivery(
      orderId,
      'ASSIGNED',
      `Assigned to ${staff.user?.name ?? staff.employeeId}${auto ? ' (auto)' : ''}`,
      tracking.id,
      staff.id,
      userId,
    );

    this.gateway.emitOrderUpdate(orderId, {
      status: OrderStatus.READY,
      message: 'Delivery assigned',
    });

    return this.getOrder(orderId);
  }

  async autoAssign(orderId: string, userId?: string) {
    const executives = await this.prisma.deliveryStaff.findMany({
      where: {
        isActive: true,
        status: { in: [DeliveryExecutiveStatus.ONLINE, DeliveryExecutiveStatus.OFFLINE] },
      },
      orderBy: [{ activeOrders: 'asc' }, { totalDeliveries: 'desc' }],
    });

    if (!executives.length) throw new BadRequestException('No available delivery executives');
    return this.assignOrder(orderId, executives[0].id, userId, true);
  }

  async updateAssignmentStatus(orderId: string, status: DeliveryAssignmentStatus, userId?: string) {
    const tracking = await this.prisma.deliveryTracking.findUnique({
      where: { orderId },
      include: { deliveryStaff: true },
    });
    if (!tracking) throw new NotFoundException('Delivery tracking not found');

    const updates: Prisma.DeliveryTrackingUpdateInput = { status };
    let orderStatus: OrderStatus | undefined;

    if (status === DeliveryAssignmentStatus.PICKED_UP) {
      updates.pickedUpAt = new Date();
    } else if (status === DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
      updates.outForDeliveryAt = new Date();
      orderStatus = OrderStatus.OUT_FOR_DELIVERY;
    }

    await this.prisma.deliveryTracking.update({ where: { orderId }, data: updates });

    if (orderStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: orderStatus,
          trackingStatus: TrackingStatus.OUT_FOR_DELIVERY,
        },
      });
      this.gateway.emitOrderUpdate(orderId, {
        status: orderStatus,
        trackingStatus: TrackingStatus.OUT_FOR_DELIVERY,
      });
      void this.notifications.notifyCustomerStatus(orderId, orderStatus);
    }

    await this.logDelivery(
      orderId,
      status,
      `Status updated to ${status}`,
      tracking.id,
      tracking.deliveryStaffId ?? undefined,
      userId,
    );
    return this.getOrder(orderId);
  }

  async verifyOtpAndDeliver(orderId: string, otp: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveryTracking: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    if (order.deliveryOtp !== otp) throw new BadRequestException('Invalid OTP');

    const now = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        trackingStatus: TrackingStatus.DELIVERED,
        paymentStatus: order.paymentMethod === 'COD' ? 'COMPLETED' : order.paymentStatus,
      },
    });

    if (order.deliveryTracking) {
      await this.prisma.deliveryTracking.update({
        where: { orderId },
        data: {
          status: DeliveryAssignmentStatus.DELIVERED,
          deliveredAt: now,
        },
      });

      await this.prisma.deliveryProof.upsert({
        where: { trackingId: order.deliveryTracking.id },
        update: { otpVerified: true, verifiedAt: now },
        create: {
          trackingId: order.deliveryTracking.id,
          otpVerified: true,
          verifiedAt: now,
        },
      });

      if (order.deliveryTracking.deliveryStaffId) {
        await this.prisma.deliveryStaff.update({
          where: { id: order.deliveryTracking.deliveryStaffId },
          data: {
            activeOrders: { decrement: 1 },
            totalDeliveries: { increment: 1 },
            todayEarnings: { increment: this.num(order.grandTotal) * 0.05 },
            status: DeliveryExecutiveStatus.ONLINE,
          },
        });
      }
    }

    await this.logDelivery(
      orderId,
      'DELIVERED',
      'Order delivered with OTP verification',
      order.deliveryTracking?.id,
      order.deliveryTracking?.deliveryStaffId ?? undefined,
      userId,
    );

    this.gateway.emitOrderUpdate(orderId, {
      status: OrderStatus.DELIVERED,
      trackingStatus: TrackingStatus.DELIVERED,
    });
    void this.notifications.notifyCustomerStatus(orderId, OrderStatus.DELIVERED);

    return this.getOrder(orderId);
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.mapOrder(order);
  }

  async getOrderTimeline(orderId: string) {
    const logs = await this.prisma.deliveryLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });

    const events = [
      ...(order
        ? [
            {
              type: 'ORDER_CREATED',
              description: 'Order placed',
              createdAt: order.createdAt.toISOString(),
            },
          ]
        : []),
      ...logs.map((l) => ({
        type: l.action,
        description: l.description,
        createdAt: l.createdAt.toISOString(),
      })),
    ];

    return events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async updateExecutiveLocation(staffUserId: string, lat: number, lng: number) {
    return this.prisma.deliveryStaff.update({
      where: { userId: staffUserId },
      data: { currentLat: lat, currentLng: lng, status: DeliveryExecutiveStatus.ONLINE },
    });
  }

  async updateExecutiveStatus(staffId: string, status: DeliveryExecutiveStatus) {
    return this.prisma.deliveryStaff.update({ where: { id: staffId }, data: { status } });
  }

  calculateZoneCharge(distanceKm: number) {
    return this.listZones().then((zones) => {
      const zone = zones.find(
        (z) => distanceKm >= this.num(z.minKm) && distanceKm <= this.num(z.maxKm),
      );
      return zone
        ? { zone: zone.name, charge: this.num(zone.charge) }
        : { zone: null, charge: null, undeliverable: true };
    });
  }
}
