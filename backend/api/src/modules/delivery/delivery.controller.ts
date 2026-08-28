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
  getDashboard(@Req() req: { user: RequestUser }) {
    return this.deliveryService.getDashboard(req.user.id, req.user.roles);
  }

  @Get('orders/list')
  @RequirePermissions('delivery.read')
  listOrders(
    @Query('status') status: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.listOrders({ status, search }, req.user.id, req.user.roles);
  }

  @Get('orders')
  @RequirePermissions('delivery.manage')
  getAssignedOrders(@Req() req: { user: RequestUser }) {
    return this.deliveryService.getAssignedOrders(req.user.id);
  }

  @Get('orders/available')
  @RequirePermissions('delivery.manage')
  getAvailableOrders(@Req() req: { user: RequestUser }) {
    return this.deliveryService.getAvailableOrders(req.user.id, req.user.roles);
  }

  @Get('orders/:id')
  @RequirePermissions('delivery.read')
  getOrder(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.getOrder(id, req.user.id, req.user.roles);
  }

  @Get('orders/:id/live-location')
  getLiveLocation(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.getLiveLocation(id, req.user.id, req.user.roles);
  }

  @Get('orders/:id/timeline')
  @RequirePermissions('delivery.read')
  getTimeline(@Param('id') id: string) {
    return this.deliveryService.getOrderTimeline(id);
  }

  @Get('executives')
  @RequirePermissions('delivery.read')
  listExecutives(@Req() req: { user: RequestUser }) {
    return this.deliveryService.listExecutives(req.user.id, req.user.roles);
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

  @Post('zones')
  @RequirePermissions('delivery.manage')
  createZone(
    @Body()
    body: {
      name: string;
      slug: string;
      minKm: number;
      maxKm: number;
      charge: number;
      minimumOrderAmount?: number;
      estimatedDeliveryMinutes?: number;
      polygon?: unknown;
    },
  ) {
    return this.deliveryService.createZone(body);
  }

  @Patch('zones/:id')
  @RequirePermissions('delivery.manage')
  updateZone(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.deliveryService.updateZone(id, body);
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
    @Body() body: { status: DeliveryAssignmentStatus; reason?: string },
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.updateAssignmentStatus(
      id,
      body.status,
      req.user.id,
      req.user.roles,
      body.reason,
    );
  }

  @Post('orders/:id/start')
  @RequirePermissions('delivery.manage')
  startDelivery(@Param('id') id: string, @Req() req: { user: RequestUser }) {
    return this.deliveryService.startDelivery(id, req.user.id, req.user.roles);
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
    @Req() req: { user: RequestUser },
  ) {
    return this.deliveryService.updateExecutiveStatus(id, body.status, req.user.id, req.user.roles);
  }

  @Patch('location')
  @RequirePermissions('delivery.manage')
  updateLocation(
    @Req() req: { user: RequestUser },
    @Body() body: { lat: number; lng: number; orderId?: string; accuracyMeters?: number },
  ) {
    return this.deliveryService.updateExecutiveLocation(
      req.user.id,
      body.lat,
      body.lng,
      body.orderId,
      body.accuracyMeters,
    );
  }
}
