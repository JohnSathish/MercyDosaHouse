import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryAssignmentStatus, DeliveryExecutiveStatus } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('dashboard')
  @RequirePermissions('delivery.read')
  getDashboard() {
    return this.deliveryService.getDashboard();
  }

  @Get('orders/list')
  @RequirePermissions('delivery.read')
  listOrders(@Query('status') status?: string, @Query('search') search?: string) {
    return this.deliveryService.listOrders({ status, search });
  }

  @Get('orders')
  @RequirePermissions('delivery.manage')
  getAssignedOrders(@Req() req: { user: RequestUser }) {
    return this.deliveryService.getAssignedOrders(req.user.id);
  }

  @Get('orders/available')
  @RequirePermissions('delivery.manage')
  getAvailableOrders() {
    return this.deliveryService.getAvailableOrders();
  }

  @Get('orders/:id')
  @RequirePermissions('delivery.read')
  getOrder(@Param('id') id: string) {
    return this.deliveryService.getOrder(id);
  }

  @Get('orders/:id/timeline')
  @RequirePermissions('delivery.read')
  getTimeline(@Param('id') id: string) {
    return this.deliveryService.getOrderTimeline(id);
  }

  @Get('executives')
  @RequirePermissions('delivery.read')
  listExecutives() {
    return this.deliveryService.listExecutives();
  }

  @Get('zones')
  @RequirePermissions('delivery.read')
  listZones() {
    return this.deliveryService.listZones();
  }

  @Get('zones/calculate')
  @RequirePermissions('delivery.read')
  calculateCharge(@Query('distanceKm') distanceKm: string) {
    return this.deliveryService.calculateZoneCharge(parseFloat(distanceKm));
  }

  @Patch('orders/:id/assign')
  @RequirePermissions('delivery.manage')
  assignToSelf(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.assignOrderByUserId(id, req.user.id, req.user.id);
  }

  @Post('orders/:id/assign')
  @RequirePermissions('delivery.read')
  assignOrder(
    @Param('id') id: string,
    @Body() body: { staffId: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.assignOrder(id, body.staffId, req.user.id);
  }

  @Post('orders/:id/auto-assign')
  @RequirePermissions('delivery.read')
  autoAssign(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.autoAssign(id, req.user.id);
  }

  @Patch('orders/:id/status')
  @RequirePermissions('delivery.manage')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: DeliveryAssignmentStatus },
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.updateAssignmentStatus(id, body.status, req.user.id);
  }

  @Patch('orders/:id/deliver')
  @RequirePermissions('delivery.manage')
  deliver(
    @Param('id') id: string,
    @Body() body: { otp: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.verifyOtpAndDeliver(id, body.otp, req.user.id);
  }

  @Patch('executives/:id/status')
  @RequirePermissions('delivery.read')
  updateExecutiveStatus(
    @Param('id') id: string,
    @Body() body: { status: DeliveryExecutiveStatus },
  ) {
    return this.deliveryService.updateExecutiveStatus(id, body.status);
  }

  @Patch('location')
  @RequirePermissions('delivery.manage')
  updateLocation(@Req() req: { user: RequestUser }, @Body() body: { lat: number; lng: number }) {
    return this.deliveryService.updateExecutiveLocation(req.user.id, body.lat, body.lng);
  }
}
