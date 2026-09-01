import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SOCKET_IO_PATH } from '@mdh/utils';
import { getWebSocketCorsConfig } from '../../common/ws-cors';

@WebSocketGateway({ namespace: '/activity', path: SOCKET_IO_PATH, cors: getWebSocketCorsConfig() })
export class ActivityGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { message: 'Connected to activity feed' });
  }

  emitActivity(activity: Record<string, unknown>) {
    this.server.emit('newActivity', activity);
  }
}
