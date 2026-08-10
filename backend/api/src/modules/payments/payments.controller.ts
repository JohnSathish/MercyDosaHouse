import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public, RequirePermissions } from '../../common/guards';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private razorpay: RazorpayService,
    private prisma: PrismaService,
  ) {}

  @RequirePermissions('orders.read')
  @Post('razorpay/create-order')
  async createRazorpayOrder(@Body() body: { orderId: string }) {
    if (!this.razorpay.isConfigured()) {
      throw new BadRequestException('Razorpay is not configured');
    }
    const order = await this.prisma.order.findUnique({ where: { id: body.orderId } });
    if (!order) throw new BadRequestException('Order not found');

    const amountPaise = Math.round(Number(order.grandTotal) * 100);
    return this.razorpay.createOrder(order.id, amountPaise, order.orderNumber);
  }

  @Public()
  @Post('razorpay/webhook')
  async razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : req.rawBody
          ? req.rawBody.toString('utf8')
          : JSON.stringify(body);

    if (!signature || !this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    return this.razorpay.handleWebhook(body as Parameters<RazorpayService['handleWebhook']>[0]);
  }
}
