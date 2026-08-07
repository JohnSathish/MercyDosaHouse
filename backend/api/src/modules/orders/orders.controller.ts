import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus, TrackingStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: { user?: RequestUser }) {
    const items = body.items as { productId: string; variantId?: string; quantity: number }[];
    const address = body.address as {
      line1: string;
      line2?: string;
      landmark?: string;
      city: string;
      pincode: string;
    };
    const deliveryAddress = [
      address.line1,
      address.line2,
      address.landmark,
      address.city,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    return this.ordersService.create({
      customerName: body.customerName as string,
      customerPhone: body.customerPhone as string,
      deliveryAddress,
      deliveryInstructions: body.deliveryInstructions as string | undefined,
      paymentMethod: body.paymentMethod as never,
      items,
      userId: req.user?.id,
      couponCode: body.couponCode as string | undefined,
    });
  }

  @Public()
  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.read')
  @Get()
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.manage')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; trackingStatus?: TrackingStatus },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.trackingStatus);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.manage')
  @Patch(':id/confirm-payment')
  confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(id);
  }
}
