import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosGateway } from './pos.gateway';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [OrdersModule, AuditModule, NotificationsModule],
  controllers: [PosController],
  providers: [PosService, PosGateway],
  exports: [PosService, PosGateway],
})
export class PosModule {}
