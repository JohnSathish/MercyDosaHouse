import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/activity', cors: { origin: '*' } })
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
