import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TrackingStatus } from '@prisma/client';
import { KitchenService } from './kitchen.service';
import { RequirePermissions } from '../../common/guards';

@ApiTags('kitchen')
@ApiBearerAuth()
@RequirePermissions('kitchen.manage')
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('orders')
  getIncomingOrders() {
    return this.kitchenService.getIncomingOrders();
  }

  @Patch('orders/:id/accept')
  acceptOrder(@Param('id') id: string) {
    return this.kitchenService.acceptOrder(id);
  }

  @Patch('orders/:id/reject')
  rejectOrder(@Param('id') id: string) {
    return this.kitchenService.rejectOrder(id);
  }

  @Patch('orders/:id/preparing')
  markPreparing(@Param('id') id: string, @Body() body: { trackingStatus?: TrackingStatus }) {
    return this.kitchenService.markPreparing(id, body.trackingStatus);
  }

  @Patch('orders/:id/ready')
  markReady(@Param('id') id: string) {
    return this.kitchenService.markReady(id);
  }
}
