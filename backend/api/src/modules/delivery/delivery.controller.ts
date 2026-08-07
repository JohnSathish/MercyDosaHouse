import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('delivery')
@ApiBearerAuth()
@RequirePermissions('delivery.manage')
@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('orders')
  getAssignedOrders(@Req() req: { user: RequestUser }) {
    return this.deliveryService.getAssignedOrders(req.user.id);
  }

  @Get('orders/available')
  getAvailableOrders() {
    return this.deliveryService.getAvailableOrders();
  }

  @Patch('orders/:id/assign')
  assignOrder(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.assignOrder(id, req.user.id);
  }

  @Patch('orders/:id/deliver')
  deliver(@Param('id') id: string, @Body() body: { otp: string }) {
    return this.deliveryService.verifyOtpAndDeliver(id, body.otp);
  }
}
