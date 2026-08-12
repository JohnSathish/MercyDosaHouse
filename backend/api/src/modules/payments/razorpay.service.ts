import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderEmailNotificationService } from '../notifications/order-email-notification.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private orderEmailNotification: OrderEmailNotificationService,
    private notificationsService: NotificationsService,
  ) {}

  isConfigured(): boolean {
    return !!(this.config.get('RAZORPAY_KEY_ID') && this.config.get('RAZORPAY_KEY_SECRET'));
  }

  async createOrder(orderId: string, amountPaise: number, receipt: string) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new BadRequestException('Razorpay is not configured');
    }

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { orderId },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Razorpay create order failed: ${body}`);
      throw new BadRequestException('Failed to create payment order');
    }

    const data = (await res.json()) as { id: string; amount: number; currency: string };
    await this.prisma.payment.updateMany({
      where: { orderId },
      data: {
        gatewayData: { razorpayOrderId: data.id, amountPaise: data.amount },
      },
    });

    return { razorpayOrderId: data.id, amount: data.amount, currency: data.currency, keyId };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
      return false;
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleWebhook(payload: {
    event: string;
    payload: {
      payment?: { entity: { id: string; order_id: string; amount: number; status: string } };
      order?: { entity: { id: string; amount: number } };
    };
  }) {
    if (payload.event !== 'payment.captured') {
      return { handled: false, event: payload.event };
    }

    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity || paymentEntity.status !== 'captured') {
      return { handled: false, reason: 'not_captured' };
    }

    const razorpayOrderId = paymentEntity.order_id;
    const payments = await this.prisma.payment.findMany({
      where: { status: { not: PaymentStatus.COMPLETED } },
      include: { order: true },
    });
    const payment = payments.find(
      (p) =>
        (p.gatewayData as { razorpayOrderId?: string } | null)?.razorpayOrderId === razorpayOrderId,
    );

    if (!payment) {
      this.logger.warn(`No local payment for Razorpay order ${razorpayOrderId}`);
      return { handled: false, reason: 'payment_not_found' };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { handled: true, duplicate: true, orderId: payment.orderId };
    }

    const expectedPaise = Math.round(Number(payment.amount) * 100);
    if (paymentEntity.amount !== expectedPaise) {
      this.logger.error(
        `Razorpay amount mismatch for order ${payment.orderId}: expected ${expectedPaise}, got ${paymentEntity.amount}`,
      );
      return { handled: false, reason: 'amount_mismatch' };
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          gatewayData: {
            ...(payment.gatewayData as object),
            razorpayPaymentId: paymentEntity.id,
            capturedAt: new Date().toISOString(),
          },
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.COMPLETED, paymentMethod: PaymentMethod.RAZORPAY },
      }),
    ]);

    this.logger.log(`Razorpay payment captured for order ${payment.orderId}`);
    void this.orderEmailNotification.notifyOrderConfirmed(payment.orderId);
    void this.notificationsService.notifyStaffNewOrder(payment.orderId);
    return { handled: true, orderId: payment.orderId };
  }
}
