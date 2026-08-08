import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [OrdersModule, InventoryModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
