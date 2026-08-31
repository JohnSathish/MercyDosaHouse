import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { AppChannelService, type OrderChannel } from './app-channel.service';

export type ChannelRequest = Request & { orderChannel?: OrderChannel };

@Injectable()
export class AppChannelInterceptor implements NestInterceptor {
  constructor(private appChannel: AppChannelService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ChannelRequest>();
    req.orderChannel = this.appChannel.resolve(req);
    return next.handle();
  }
}

export function orderChannelOf(req: { orderChannel?: OrderChannel } | undefined): OrderChannel {
  return req?.orderChannel === 'ANDROID' ? 'ANDROID' : 'WEBSITE';
}
