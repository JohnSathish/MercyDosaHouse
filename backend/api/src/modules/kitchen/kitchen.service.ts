import { Injectable } from '@nestjs/common';
import { OrderStatus, TrackingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
  ) {}

  getIncomingOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING] },
      },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async acceptOrder(id: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.ACCEPTED, trackingStatus: TrackingStatus.ACCEPTED },
      include: { items: true },
    });
    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.ACCEPTED,
      trackingStatus: TrackingStatus.ACCEPTED,
    });
    return order;
  }

  async rejectOrder(id: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
    this.gateway.emitOrderUpdate(id, { status: OrderStatus.CANCELLED });
    return order;
  }

  async markPreparing(id: string, trackingStatus: TrackingStatus = TrackingStatus.PREPARING) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.PREPARING, trackingStatus },
      include: { items: true },
    });
    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.PREPARING,
      trackingStatus,
    });
    return order;
  }

  async markReady(id: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.READY, trackingStatus: TrackingStatus.PACKING },
      include: { items: true },
    });
    this.gateway.emitOrderUpdate(id, {
      status: OrderStatus.READY,
      trackingStatus: TrackingStatus.PACKING,
    });
    return order;
  }
}
