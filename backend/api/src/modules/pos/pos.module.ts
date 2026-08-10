import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosGateway } from './pos.gateway';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [OrdersModule, AuditModule],
  controllers: [PosController],
  providers: [PosService, PosGateway],
  exports: [PosService, PosGateway],
})
export class PosModule {}
