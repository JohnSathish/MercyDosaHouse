import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus, TrackingStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { Public, RequirePermissions, RequestUser } from '../../common/guards';
import { PrismaService } from '../../prisma/prisma.service';
import { orderChannelOf } from '../../common/app-channel.interceptor';
import type { OrderChannel } from '../../common/app-channel.service';

type AuthRequest = { user?: RequestUser; orderChannel?: OrderChannel };

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post('quote')
  quote(@Body() body: Record<string, unknown>, @Req() req: AuthRequest) {
    const items = body.items as { productId: string; variantId?: string; quantity: number }[];
    const scheduledAt = body.scheduledDeliveryAt as string | undefined;
    return this.ordersService.quote({
      items,
      userId: req.user?.id,
      couponCode: body.couponCode as string | undefined,
      scheduledDeliveryAt: scheduledAt ? new Date(scheduledAt) : undefined,
      rewardPointsUsed: body.rewardPointsUsed as number | undefined,
      orderType: (body.orderType as 'DELIVERY' | 'ONLINE_PICKUP' | undefined) ?? 'DELIVERY',
      orderSource: orderChannelOf(req),
      customerPhone: body.customerPhone as string | undefined,
    });
  }

  @Public()
  @Post()
  async create(@Body() body: Record<string, unknown>, @Req() req: AuthRequest) {
    const items = body.items as { productId: string; variantId?: string; quantity: number }[];
    const addressId = body.addressId as string | undefined;
    let address = body.address as
      | {
          contactName?: string;
          mobileNumber?: string;
          line1: string;
          line2?: string;
          landmark?: string;
          city: string;
          state?: string;
          pincode: string;
          latitude?: number;
          longitude?: number;
          deliveryNotes?: string;
        }
      | undefined;

    let customerName = body.customerName as string;
    let customerPhone = body.customerPhone as string;

    if (addressId && req.user?.id) {
      const saved = await this.prisma.address.findFirst({
        where: { id: addressId, userId: req.user.id },
      });
      if (!saved) throw new BadRequestException('Address not found');
      address = {
        contactName: saved.contactName,
        mobileNumber: saved.mobileNumber,
        line1: saved.line1,
        line2: saved.line2 ?? undefined,
        landmark: saved.landmark ?? undefined,
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
        deliveryNotes: saved.deliveryNotes ?? undefined,
        latitude: saved.latitude ?? undefined,
        longitude: saved.longitude ?? undefined,
      };
      customerName = customerName || saved.contactName;
      customerPhone = customerPhone || saved.mobileNumber;
    }

    if (!address) throw new BadRequestException('Delivery address is required');

    const deliveryAddress = [
      address.line1,
      address.line2,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    const scheduledAt = body.scheduledDeliveryAt as string | undefined;

    return this.ordersService.create({
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryInstructions:
        (body.deliveryInstructions as string | undefined) || address.deliveryNotes,
      deliveryLandmark: address.landmark,
      deliveryLatitude: address.latitude,
      deliveryLongitude: address.longitude,
      paymentMethod: body.paymentMethod as never,
      items,
      userId: req.user?.id,
      couponCode: body.couponCode as string | undefined,
      addressId,
      scheduledDeliveryAt: scheduledAt ? new Date(scheduledAt) : undefined,
      rewardPointsUsed: body.rewardPointsUsed as number | undefined,
      orderType: (body.orderType as 'DELIVERY' | 'ONLINE_PICKUP' | undefined) ?? 'DELIVERY',
      orderSource: orderChannelOf(req),
    });
  }

  @Public()
  @Get('track/:orderNumber')
  track(
    @Param('orderNumber') orderNumber: string,
    @Query('trackToken') trackToken: string | undefined,
    @Req() req: AuthRequest,
  ) {
    return this.ordersService.findByOrderNumber(orderNumber, {
      user: req.user,
      trackToken,
    });
  }

  @Public()
  @Post('track/:orderNumber/otp')
  requestTrackOtp(@Param('orderNumber') orderNumber: string, @Body() body: { phone?: string }) {
    if (!body.phone?.trim()) throw new BadRequestException('Phone number is required');
    return this.ordersService.requestTrackOtp(orderNumber, body.phone);
  }

  @Public()
  @Post('track/:orderNumber/verify')
  verifyTrackOtp(
    @Param('orderNumber') orderNumber: string,
    @Body() body: { phone?: string; otp?: string },
  ) {
    if (!body.phone?.trim() || !body.otp?.trim()) {
      throw new BadRequestException('Phone number and code are required');
    }
    return this.ordersService.verifyTrackOtp(orderNumber, body.phone, body.otp);
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
    @Body() body: { status: OrderStatus; trackingStatus?: TrackingStatus; remarks?: string },
    @Req() req: AuthRequest,
  ) {
    return this.ordersService.updateStatus(id, body.status, {
      trackingStatus: body.trackingStatus,
      updatedById: req.user?.id,
      remarks: body.remarks,
    });
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.manage')
  @Patch(':id/reject')
  rejectOrder(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: AuthRequest) {
    return this.ordersService.rejectOrder(id, body.reason, req.user?.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.manage')
  @Patch(':id/confirm-payment')
  confirmPayment(@Param('id') id: string) {
    return this.ordersService.confirmPayment(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('orders.manage')
  @Post(':id/resend-order-email')
  resendOrderEmail(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.ordersService.resendOrderEmail(id, req.user?.id, req.user?.name ?? undefined);
  }
}
