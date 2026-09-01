import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SOCKET_IO_PATH } from '@mdh/utils';
import { getWebSocketCorsConfig } from '../../common/ws-cors';

@WebSocketGateway({
  namespace: '/notifications',
  path: SOCKET_IO_PATH,
  cors: getWebSocketCorsConfig(),
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    const rawToken =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!rawToken) {
      client.emit('connected', { message: 'Connected without inbox room' });
      return;
    }
    try {
      const userId = this.jwt.verify<{ sub: string }>(rawToken).sub;
      if (userId) client.join(`user:${userId}`);
      client.emit('connected', { message: 'Connected to notifications' });
    } catch {
      client.emit('connected', { message: 'Connected without inbox room' });
    }
  }

  emitToUser(userId: string, payload: Record<string, unknown>) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { unreadCount });
  }
}
