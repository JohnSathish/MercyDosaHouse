import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getWebSocketCorsConfig } from '../../common/ws-cors';

@WebSocketGateway({ namespace: '/orders', cors: getWebSocketCorsConfig() })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Connected to order tracking' });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, orderId: string) {
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
    this.server.emit('orderStatusChanged', { orderId, ...data });
  }
}
