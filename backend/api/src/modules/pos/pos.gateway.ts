import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getWebSocketCorsConfig } from '../../common/ws-cors';

@WebSocketGateway({ namespace: '/pos', cors: getWebSocketCorsConfig() })
export class PosGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Connected to POS' });
  }

  @SubscribeMessage('subscribeBill')
  handleSubscribeBill(client: Socket, billId: string) {
    client.join(`bill:${billId}`);
    return { event: 'subscribed', data: billId };
  }

  emitBillUpdate(billId: string, data: Record<string, unknown>) {
    this.server.to(`bill:${billId}`).emit('billUpdate', { billId, ...data });
    this.server.emit('posBillChanged', { billId, ...data });
  }

  emitTableUpdate(tableId: string, data: Record<string, unknown>) {
    this.server.emit('tableUpdate', { tableId, ...data });
  }

  emitAnalytics(data: Record<string, unknown>) {
    this.server.emit('posAnalytics', data);
  }
}
