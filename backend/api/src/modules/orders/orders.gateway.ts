import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getWebSocketCorsConfig } from '../../common/ws-cors';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ namespace: '/orders', cors: getWebSocketCorsConfig() })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Connected to order tracking' });
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, orderId: string) {
    const rawToken =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!rawToken || !orderId) {
      client.emit('subscriptionDenied', { reason: 'Authentication required' });
      return;
    }
    let userId: string;
    try {
      userId = this.jwt.verify<{ sub: string }>(rawToken).sub;
    } catch {
      client.emit('subscriptionDenied', { reason: 'Invalid session' });
      return;
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        userId: true,
        deliveryTracking: { select: { deliveryStaff: { select: { userId: true } } } },
      },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });
    const role = user?.role?.name;
    const allowed =
      !!order &&
      (order.userId === userId ||
        order.deliveryTracking?.deliveryStaff?.userId === userId ||
        role === 'SUPER_ADMIN' ||
        role === 'MANAGER');
    if (!allowed) {
      client.emit('subscriptionDenied', { reason: 'Not authorized for this order' });
      return;
    }
    client.join(`order:${orderId}`);
    return { event: 'subscribed', data: orderId };
  }

  emitNewOrder(order: {
    id: string;
    orderNumber: string;
    status: string;
    customerName?: string;
    orderType?: string;
    grandTotal?: number | string;
  }) {
    this.server.emit('newOrder', order);
  }

  emitOrderUpdate(
    orderId: string,
    data: { status: string; trackingStatus?: string; message?: string },
  ) {
    this.server.to(`order:${orderId}`).emit('orderUpdate', { orderId, ...data });
  }

  emitDeliveryLocation(
    orderId: string,
    data: {
      staffId?: string | null;
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
      updatedAt: string;
      distanceKm?: number | null;
      etaMinutes?: number | null;
      routePolyline?: string | null;
    },
  ) {
    this.server.to(`order:${orderId}`).emit('deliveryLocation', { orderId, ...data });
  }
}
