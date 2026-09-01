import { IoAdapter } from '@nestjs/platform-socket.io';
import { SOCKET_IO_PATH } from '@mdh/utils';
import type { ServerOptions } from 'socket.io';
import { getWebSocketCorsConfig } from './ws-cors';

export class AppIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      path: SOCKET_IO_PATH,
      cors: getWebSocketCorsConfig(),
    });
  }
}
