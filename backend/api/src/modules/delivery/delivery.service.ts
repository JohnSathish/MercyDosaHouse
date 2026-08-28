import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
import { RoutingService } from './routing.service';
import { isValidOrderStatusTransition } from '../orders/order-status-transitions';

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

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ASSIGNMENT_TRANSITIONS: Partial<
  Record<DeliveryAssignmentStatus, DeliveryAssignmentStatus[]>
> = {
  WAITING: [DeliveryAssignmentStatus.ASSIGNED, DeliveryAssignmentStatus.CANCELLED],
  ASSIGNED: [DeliveryAssignmentStatus.PICKED_UP, DeliveryAssignmentStatus.CANCELLED],
  PICKED_UP: [DeliveryAssignmentStatus.OUT_FOR_DELIVERY, DeliveryAssignmentStatus.CANCELLED],
  OUT_FOR_DELIVERY: [DeliveryAssignmentStatus.DELIVERED, DeliveryAssignmentStatus.CANCELLED],
};

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private notifications: NotificationsService,
    private routing: RoutingService,
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
      deliveryLandmark: order.deliveryLandmark,
      deliveryLatitude: order.deliveryLatitude,
      deliveryLongitude: order.deliveryLongitude,
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
            lastLocationAt: tracking.lastLocationAt?.toISOString() ?? null,
            locationAccuracyMeters: tracking.locationAccuracyMeters,
            locationSharingActive: tracking.locationSharingActive,
            routePolyline: tracking.routePolyline,
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

  async getDashboard(userId?: string, roles: string[] = []) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (userId && roles.includes('DELIVERY_STAFF')) {
      return this.getAgentDashboard(userId, todayStart);
    }

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

  private async getAgentDashboard(userId: string, todayStart: Date) {
    const [staff, assigned, deliveredToday] = await Promise.all([
      this.prisma.deliveryStaff.findUnique({ where: { userId }, include: { user: true } }),
      this.getAssignedOrders(userId),
      this.prisma.deliveryTracking.count({
        where: {
          deliveryStaff: { userId },
          deliveredAt: { gte: todayStart },
        },
      }),
    ]);
    const active = assigned.filter((order) => order.status === OrderStatus.OUT_FOR_DELIVERY);
    return {
      stats: {
        waiting: assigned.filter((order) => order.status === OrderStatus.READY).length,
        assigned: assigned.filter(
          (order) => order.assignment?.status === DeliveryAssignmentStatus.ASSIGNED,
        ).length,
        pickedUp: assigned.filter(
          (order) => order.assignment?.status === DeliveryAssignmentStatus.PICKED_UP,
        ).length,
        onTheWay: active.length,
        deliveredToday,
        cancelledToday: 0,
        avgDeliveryMinutes: 0,
        deliveryRevenue: 0,
        onlineRiders:
          staff?.status === DeliveryExecutiveStatus.ONLINE ||
          staff?.status === DeliveryExecutiveStatus.BUSY
            ? 1
            : 0,
      },
      executives: staff
        ? [
            {
              id: staff.id,
              employeeId: staff.employeeId,
              name: staff.user?.name ?? 'Rider',
              phone: staff.user?.phone,
              rating: this.num(staff.rating),
              status: staff.status,
              activeOrders: staff.activeOrders,
              totalDeliveries: staff.totalDeliveries,
              todayEarnings: this.num(staff.todayEarnings),
              vehicleNumber: staff.vehicleNumber,
              currentLat: staff.currentLat,
              currentLng: staff.currentLng,
            },
          ]
        : [],
      pendingOrders: assigned,
      recentDeliveries: [],
      liveRiders:
        staff && staff.currentLat != null && staff.currentLng != null
          ? [
              {
                id: staff.id,
                name: staff.user?.name,
                lat: staff.currentLat,
                lng: staff.currentLng,
                status: staff.status,
              },
            ]
          : [],
    };
  }

  async listOrders(
    query: { status?: string; search?: string },
    userId?: string,
    roles: string[] = [],
  ) {
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
    if (userId && roles.includes('DELIVERY_STAFF')) {
      where.deliveryTracking = { deliveryStaff: { userId } };
    }

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

  getAvailableOrders(userId?: string, roles: string[] = []) {
    if (userId && roles.includes('DELIVERY_STAFF')) return Promise.resolve([]);
    return this.prisma.order
      .findMany({
        where: { status: OrderStatus.READY, deliveryTracking: null },
        include: orderInclude,
        orderBy: { createdAt: 'asc' },
      })
      .then((orders) => orders.map((o) => this.mapOrder(o)));
  }

  async listExecutives(userId?: string, roles: string[] = []) {
    const rows = await this.prisma.deliveryStaff.findMany({
      where: {
        isActive: true,
        ...(userId && roles.includes('DELIVERY_STAFF') ? { userId } : {}),
      },
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
      minimumOrderAmount: z.minimumOrderAmount ? this.num(z.minimumOrderAmount) : null,
      estimatedDeliveryMinutes: z.estimatedDeliveryMinutes,
      polygon: Array.isArray(z.polygon) ? z.polygon : null,
    }));
  }

  async createZone(data: {
    name: string;
    slug: string;
    minKm: number;
    maxKm: number;
    charge: number;
    minimumOrderAmount?: number;
    estimatedDeliveryMinutes?: number;
    polygon?: unknown;
  }) {
    if (!data.name?.trim() || !data.slug?.trim() || data.minKm < 0 || data.maxKm <= data.minKm) {
      throw new BadRequestException('Invalid delivery zone');
    }
    return this.prisma.deliveryZone.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        minKm: data.minKm,
        maxKm: data.maxKm,
        charge: data.charge,
        minimumOrderAmount: data.minimumOrderAmount,
        estimatedDeliveryMinutes: data.estimatedDeliveryMinutes,
        polygon: data.polygon as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateZone(id: string, data: Record<string, unknown>) {
    const allowed: Record<string, unknown> = {};
    for (const key of [
      'name',
      'slug',
      'minKm',
      'maxKm',
      'charge',
      'minimumOrderAmount',
      'estimatedDeliveryMinutes',
      'isActive',
      'polygon',
    ]) {
      if (data[key] !== undefined) allowed[key] = data[key];
    }
    return this.prisma.deliveryZone.update({
      where: { id },
      data: allowed as Prisma.DeliveryZoneUpdateInput,
    });
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

    const previousTracking = await this.prisma.deliveryTracking.findUnique({
      where: { orderId },
      select: { deliveryStaffId: true },
    });
    const route =
      staff.currentLat != null &&
      staff.currentLng != null &&
      order.deliveryLatitude != null &&
      order.deliveryLongitude != null
        ? await this.routing.getRoute(
            { latitude: staff.currentLat, longitude: staff.currentLng },
            { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude },
          )
        : null;

    const tracking = await this.prisma.deliveryTracking.upsert({
      where: { orderId },
      update: {
        deliveryStaffId: staff.id,
        status: DeliveryAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        etaMinutes: route?.durationMinutes ?? null,
        distanceKm: route?.distanceKm ?? null,
        routePolyline: route?.polyline ?? null,
      },
      create: {
        orderId,
        deliveryStaffId: staff.id,
        status: DeliveryAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        etaMinutes: route?.durationMinutes ?? null,
        distanceKm: route?.distanceKm ?? null,
        routePolyline: route?.polyline ?? null,
      },
    });

    if (!previousTracking || previousTracking.deliveryStaffId !== staff.id) {
      if (previousTracking?.deliveryStaffId) {
        await this.prisma.deliveryStaff.updateMany({
          where: { id: previousTracking.deliveryStaffId, activeOrders: { gt: 0 } },
          data: { activeOrders: { decrement: 1 }, status: DeliveryExecutiveStatus.ONLINE },
        });
      }
      await this.prisma.deliveryStaff.update({
        where: { id: staff.id },
        data: {
          activeOrders: { increment: 1 },
          status: DeliveryExecutiveStatus.BUSY,
        },
      });
    }

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

  async updateAssignmentStatus(
    orderId: string,
    status: DeliveryAssignmentStatus,
    userId?: string,
    roles: string[] = [],
  ) {
    const tracking = await this.prisma.deliveryTracking.findUnique({
      where: { orderId },
      include: { deliveryStaff: true },
    });
    if (!tracking) throw new NotFoundException('Delivery tracking not found');
    const isAdmin = roles.some((role) => role === 'SUPER_ADMIN' || role === 'MANAGER');
    if (tracking.deliveryStaff?.userId && tracking.deliveryStaff.userId !== userId && !isAdmin) {
      throw new ForbiddenException('This delivery is assigned to another delivery agent');
    }
    if (tracking.status === status) return this.getOrder(orderId);
    if (!(ASSIGNMENT_TRANSITIONS[tracking.status] ?? []).includes(status)) {
      throw new BadRequestException(`Cannot move delivery from ${tracking.status} to ${status}`);
    }

    const updates: Prisma.DeliveryTrackingUpdateInput = { status };
    let orderStatus: OrderStatus | undefined;
    let previousOrderStatus: OrderStatus | undefined;

    if (status === DeliveryAssignmentStatus.PICKED_UP) {
      updates.pickedUpAt = new Date();
    } else if (status === DeliveryAssignmentStatus.OUT_FOR_DELIVERY) {
      const config = await this.prisma.deliveryConfig.findFirst({ where: { isActive: true } });
      if (config?.trackingEnabled === false) {
        throw new BadRequestException('Live delivery tracking is currently disabled');
      }
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order || !isValidOrderStatusTransition(order.status, OrderStatus.OUT_FOR_DELIVERY)) {
        throw new BadRequestException('Order must be READY before delivery can start');
      }
      previousOrderStatus = order.status;
      updates.outForDeliveryAt = new Date();
      updates.locationSharingActive = true;
      orderStatus = OrderStatus.OUT_FOR_DELIVERY;
    } else if (
      status === DeliveryAssignmentStatus.DELIVERED ||
      status === DeliveryAssignmentStatus.CANCELLED
    ) {
      updates.locationSharingActive = false;
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
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: previousOrderStatus,
          newStatus: orderStatus,
          updatedById: userId,
          remarks: 'Delivery started',
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
    if (
      order.status !== OrderStatus.OUT_FOR_DELIVERY ||
      order.deliveryTracking?.status !== DeliveryAssignmentStatus.OUT_FOR_DELIVERY
    ) {
      throw new BadRequestException('Only an out-for-delivery order can be delivered');
    }
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

  async getOrder(orderId: string, userId?: string, roles: string[] = []) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && roles.includes('DELIVERY_STAFF')) {
      if (order.deliveryTracking?.deliveryStaff?.userId !== userId) {
        throw new ForbiddenException('This delivery is not assigned to you');
      }
    }
    return this.mapOrder(order);
  }

  async startDelivery(orderId: string, userId: string, roles: string[] = []) {
    const tracking = await this.prisma.deliveryTracking.findUnique({
      where: { orderId },
      include: { deliveryStaff: true },
    });
    if (!tracking) throw new NotFoundException('Delivery assignment not found');
    const isAdmin = roles.some((role) => role === 'SUPER_ADMIN' || role === 'MANAGER');
    if (!isAdmin && tracking.deliveryStaff?.userId !== userId) {
      throw new ForbiddenException('This delivery is not assigned to you');
    }
    return this.updateAssignmentStatus(
      orderId,
      DeliveryAssignmentStatus.OUT_FOR_DELIVERY,
      userId,
      roles,
    );
  }

  async getLiveLocation(orderId: string, userId: string, roles: string[] = []) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryTracking: {
          include: { deliveryStaff: { include: { user: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin = roles.some((role) => role === 'SUPER_ADMIN' || role === 'MANAGER');
    const isAssignedAgent = order.deliveryTracking?.deliveryStaff?.userId === userId;
    if (!isAdmin && !isAssignedAgent && order.userId !== userId) {
      throw new ForbiddenException('You are not authorized to view this delivery');
    }

    const tracking = order.deliveryTracking;
    const config = await this.prisma.deliveryConfig.findFirst({ where: { isActive: true } });
    const active =
      config?.customerTrackingEnabled !== false &&
      order.status === OrderStatus.OUT_FOR_DELIVERY &&
      tracking?.status === DeliveryAssignmentStatus.OUT_FOR_DELIVERY &&
      tracking.locationSharingActive === true;
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      active,
      customer: {
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
        address: order.deliveryAddress,
      },
      agent:
        tracking?.deliveryStaff && (active || isAdmin || isAssignedAgent)
          ? {
              name: tracking.deliveryStaff.user?.name ?? null,
              phone: tracking.deliveryStaff.user?.phone ?? null,
              latitude: tracking.latitude,
              longitude: tracking.longitude,
              accuracyMeters: tracking.locationAccuracyMeters,
              lastUpdatedAt: tracking.lastLocationAt?.toISOString() ?? null,
            }
          : null,
      distanceKm: tracking?.distanceKm ? this.num(tracking.distanceKm) : null,
      etaMinutes: tracking?.etaMinutes ?? null,
      routePolyline: tracking?.routePolyline ?? null,
      lastUpdatedAt: tracking?.lastLocationAt?.toISOString() ?? null,
    };
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

  async updateExecutiveLocation(
    staffUserId: string,
    lat: number,
    lng: number,
    orderId?: string,
    accuracyMeters?: number,
  ) {
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException('Invalid GPS coordinates');
    }
    if (
      accuracyMeters != null &&
      (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)
    ) {
      throw new BadRequestException('Invalid GPS accuracy');
    }
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { userId: staffUserId } });
    if (!staff || !staff.isActive)
      throw new ForbiddenException('Delivery agent profile is inactive');
    if (!orderId) {
      return this.prisma.deliveryStaff.update({
        where: { id: staff.id },
        data: { currentLat: lat, currentLng: lng, status: DeliveryExecutiveStatus.ONLINE },
      });
    }

    const tracking = await this.prisma.deliveryTracking.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!tracking || tracking.deliveryStaffId !== staff.id) {
      throw new ForbiddenException('This delivery is not assigned to you');
    }
    if (
      tracking.status !== DeliveryAssignmentStatus.OUT_FOR_DELIVERY ||
      !tracking.locationSharingActive
    ) {
      throw new BadRequestException('Location sharing is only active during delivery');
    }
    const now = new Date();
    const config = await this.prisma.deliveryConfig.findFirst({ where: { isActive: true } });
    if (
      tracking.lastLocationAt &&
      tracking.latitude != null &&
      tracking.longitude != null &&
      config &&
      now.getTime() - tracking.lastLocationAt.getTime() <
        config.locationUpdateIntervalSeconds * 1000 &&
      distanceMeters(tracking.latitude, tracking.longitude, lat, lng) <
        config.locationMinDistanceMeters
    ) {
      return {
        orderId,
        latitude: tracking.latitude,
        longitude: tracking.longitude,
        updatedAt: tracking.lastLocationAt.toISOString(),
      };
    }
    const route =
      tracking.order.deliveryLatitude != null && tracking.order.deliveryLongitude != null
        ? await this.routing.getRoute(
            { latitude: lat, longitude: lng },
            {
              latitude: tracking.order.deliveryLatitude,
              longitude: tracking.order.deliveryLongitude,
            },
          )
        : null;
    const shouldNotifyNearby =
      config?.nearCustomerEnabled === true &&
      tracking.nearCustomerNotifiedAt == null &&
      tracking.order.deliveryLatitude != null &&
      tracking.order.deliveryLongitude != null &&
      distanceMeters(lat, lng, tracking.order.deliveryLatitude, tracking.order.deliveryLongitude) <=
        (config.nearCustomerThresholdMeters || 500);
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.deliveryTracking.update({
        where: { id: tracking.id },
        data: {
          latitude: lat,
          longitude: lng,
          lastLocationAt: now,
          locationAccuracyMeters: accuracyMeters ?? null,
          distanceKm: route?.distanceKm ?? undefined,
          etaMinutes: route?.durationMinutes ?? undefined,
          routePolyline: route?.polyline ?? undefined,
          nearCustomerNotifiedAt: shouldNotifyNearby ? now : undefined,
        },
      });
      await tx.deliveryStaff.update({
        where: { id: staff.id },
        data: { currentLat: lat, currentLng: lng, status: DeliveryExecutiveStatus.BUSY },
      });
      await tx.deliveryLocationPoint.create({
        data: {
          trackingId: tracking.id,
          latitude: lat,
          longitude: lng,
          accuracyMeters: accuracyMeters ?? null,
        },
      });
      if (config) {
        await tx.deliveryLocationPoint.deleteMany({
          where: {
            trackingId: tracking.id,
            recordedAt: {
              lt: new Date(Date.now() - config.locationHistoryRetentionDays * 86_400_000),
            },
          },
        });
      }
      return next;
    });

    this.gateway.emitDeliveryLocation(orderId, {
      staffId: staff.id,
      latitude: lat,
      longitude: lng,
      accuracyMeters: accuracyMeters ?? null,
      updatedAt: now.toISOString(),
      distanceKm: updated.distanceKm ? this.num(updated.distanceKm) : null,
      etaMinutes: updated.etaMinutes,
      routePolyline: updated.routePolyline,
    });
    if (shouldNotifyNearby) void this.notifications.notifyCustomerNearby(orderId);
    return {
      orderId,
      latitude: updated.latitude,
      longitude: updated.longitude,
      updatedAt: updated.lastLocationAt?.toISOString() ?? now.toISOString(),
    };
  }

  async updateExecutiveStatus(
    staffId: string,
    status: DeliveryExecutiveStatus,
    userId?: string,
    roles: string[] = [],
  ) {
    if (userId && roles.includes('DELIVERY_STAFF')) {
      const own = await this.prisma.deliveryStaff.findFirst({ where: { id: staffId, userId } });
      if (!own) throw new ForbiddenException('You can only update your own availability');
    }
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
