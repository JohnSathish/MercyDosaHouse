import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderStatus, TrackingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
  ) {}

  getAssignedOrders(staffUserId: string) {
    return this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] },
        deliveryTracking: { deliveryStaff: { userId: staffUserId } },
      },
      include: { items: true, deliveryTracking: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  getAvailableOrders() {
    return this.prisma.order.findMany({
      where: { status: OrderStatus.READY },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignOrder(orderId: string, staffUserId: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({
      where: { userId: staffUserId },
    });
    if (!staff) throw new BadRequestException('Delivery staff not found');

    await this.prisma.deliveryTracking.upsert({
      where: { orderId },
      update: { deliveryStaffId: staff.id },
      create: { orderId, deliveryStaffId: staff.id },
    });

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.OUT_FOR_DELIVERY,
        trackingStatus: TrackingStatus.OUT_FOR_DELIVERY,
      },
      include: { items: true, deliveryTracking: true },
    });

    this.gateway.emitOrderUpdate(orderId, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      trackingStatus: TrackingStatus.OUT_FOR_DELIVERY,
    });
    return order;
  }

  async verifyOtpAndDeliver(orderId: string, otp: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.deliveryOtp !== otp) throw new BadRequestException('Invalid OTP');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        trackingStatus: TrackingStatus.DELIVERED,
        paymentStatus: 'COMPLETED',
      },
    });

    await this.prisma.deliveryTracking.updateMany({
      where: { orderId },
      data: { deliveredAt: new Date() },
    });

    this.gateway.emitOrderUpdate(orderId, {
      status: OrderStatus.DELIVERED,
      trackingStatus: TrackingStatus.DELIVERED,
    });
    return updated;
  }
}
