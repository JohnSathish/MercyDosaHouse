import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KitchenItemStatus, KitchenPriority, TrackingStatus } from '@prisma/client';
import { KitchenService } from './kitchen.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('kitchen')
@ApiBearerAuth()
@RequirePermissions('kitchen.manage')
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('stations')
  getStations() {
    return this.kitchenService.getStations();
  }

  @Get('dashboard')
  getDashboard(
    @Query('status') status?: string,
    @Query('station') station?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: KitchenPriority,
  ) {
    return this.kitchenService.getDashboard({ status, station, search, priority });
  }

  @Get('orders')
  getIncomingOrders() {
    return this.kitchenService.getIncomingOrders();
  }

  @Get('orders/:id/logs')
  getOrderLogs(@Param('id') id: string) {
    return this.kitchenService.getLogs(id);
  }

  @Patch('orders/:id/accept')
  acceptOrder(@Param('id') id: string, @Req() req: { user?: { sub: string } }) {
    return this.kitchenService.acceptOrder(id, req.user?.sub);
  }

  @Patch('orders/:id/reject')
  rejectOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.kitchenService.rejectOrder(id, body.reason, req.user?.sub);
  }

  @Patch('orders/:id/preparing')
  markPreparing(
    @Param('id') id: string,
    @Body() body: { trackingStatus?: TrackingStatus },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.kitchenService.markPreparing(id, req.user?.sub, body.trackingStatus);
  }

  @Patch('orders/:id/ready')
  markReady(@Param('id') id: string, @Req() req: { user?: { sub: string } }) {
    return this.kitchenService.markReady(id, req.user?.sub);
  }

  @Patch('orders/:id/complete')
  markComplete(@Param('id') id: string, @Req() req: { user?: { sub: string } }) {
    return this.kitchenService.markComplete(id, req.user?.sub);
  }

  @Patch('orders/:id/items/:itemId/status')
  updateItemStatus(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: { kitchenStatus: KitchenItemStatus },
    @Req() req: { user?: { sub: string } },
  ) {
    return this.kitchenService.updateItemStatus(orderId, itemId, body.kitchenStatus, req.user?.sub);
  }

  @Patch('queue/reorder')
  reorderQueue(@Body() body: { orderIds: string[] }) {
    return this.kitchenService.reorderQueue(body.orderIds);
  }
}
