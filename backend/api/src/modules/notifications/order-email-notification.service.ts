import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderEmailNotificationStatus,
  OrderEmailNotificationType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from './email.service';
import {
  buildOrderConfirmedHtml,
  buildOrderConfirmedSubject,
  buildOrderConfirmedText,
  ORDER_CONFIRMED_TYPE,
  type OrderEmailPayload,
} from './order-email.template';

const MAX_AUTO_ATTEMPTS = 3;
const DEFERRED_PAYMENT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.RAZORPAY,
  PaymentMethod.CASHFREE,
  PaymentMethod.UPI,
]);

@Injectable()
export class OrderEmailNotificationService {
  private readonly logger = new Logger(OrderEmailNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  /** COD and similar — notify immediately after order is created. */
  shouldNotifyOnOrderCreate(paymentMethod: PaymentMethod): boolean {
    return paymentMethod === PaymentMethod.COD;
  }

  /** Online / manual-verify payments — notify only after server-side payment confirmation. */
  shouldDeferUntilPaymentConfirmed(paymentMethod: PaymentMethod): boolean {
    return DEFERRED_PAYMENT_METHODS.has(paymentMethod);
  }

  getRecipients(): string[] {
    const raw =
      this.config.get<string>('ORDER_NOTIFICATION_RECIPIENTS') ||
      'johnsathish16@gmail.com,nambikaimary96@gmail.com,alboraja@gmail.com';
    return raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }

  async notifyOrderConfirmed(orderId: string, options?: { force?: boolean }): Promise<void> {
    try {
      await this.sendOrderConfirmed(orderId, options);
    } catch (err) {
      this.logger.error(
        `Order email notification failed for ${orderId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async resendOrderConfirmed(orderId: string, userId?: string, userName?: string): Promise<void> {
    await this.sendOrderConfirmed(orderId, { force: true, triggeredBy: { userId, userName } });
  }

  private async sendOrderConfirmed(
    orderId: string,
    options?: { force?: boolean; triggeredBy?: { userId?: string; userName?: string } },
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        posTable: { select: { label: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'CANCELLED') {
      this.logger.debug(`Skipping email for cancelled order ${order.orderNumber}`);
      return;
    }

    const recipients = this.getRecipients();
    if (!recipients.length) {
      this.logger.warn('ORDER_NOTIFICATION_RECIPIENTS is empty — skipping order email');
      return;
    }

    const existing = await this.prisma.orderEmailNotification.findUnique({
      where: {
        orderId_notificationType: {
          orderId,
          notificationType: ORDER_CONFIRMED_TYPE,
        },
      },
    });

    if (existing?.status === OrderEmailNotificationStatus.SENT && !options?.force) {
      this.logger.debug(`Order email already sent for ${order.orderNumber}`);
      return;
    }

    if (
      existing &&
      existing.attemptCount >= MAX_AUTO_ATTEMPTS &&
      !options?.force &&
      existing.status === OrderEmailNotificationStatus.FAILED
    ) {
      this.logger.warn(`Max email attempts reached for order ${order.orderNumber}`);
      return;
    }

    const record = await this.prisma.orderEmailNotification.upsert({
      where: {
        orderId_notificationType: {
          orderId,
          notificationType: ORDER_CONFIRMED_TYPE,
        },
      },
      create: {
        orderId,
        notificationType: OrderEmailNotificationType.ORDER_CONFIRMED,
        status: OrderEmailNotificationStatus.RETRYING,
        recipients,
        attemptCount: 0,
      },
      update: {
        status: OrderEmailNotificationStatus.RETRYING,
        recipients,
        lastError: null,
      },
    });

    if (!this.emailService.isConfigured()) {
      const status = this.emailService.getConfigStatus();
      await this.markFailed(
        record.id,
        status.missing?.length
          ? `Email not configured — missing ${status.missing.join(', ')}`
          : 'Email provider not configured',
        order.orderNumber,
        orderId,
      );
      return;
    }

    const payload = this.buildPayload(order);
    const subject = buildOrderConfirmedSubject(payload);
    const html = buildOrderConfirmedHtml(payload);
    const text = buildOrderConfirmedText(payload);

    const result = await this.emailService.send({
      to: recipients,
      subject,
      html,
      text,
    });

    const nextAttempt = record.attemptCount + 1;

    if (result.sent) {
      await this.prisma.orderEmailNotification.update({
        where: { id: record.id },
        data: {
          status: OrderEmailNotificationStatus.SENT,
          attemptCount: nextAttempt,
          sentAt: new Date(),
          lastError: null,
        },
      });

      await this.audit.log({
        userId: options?.triggeredBy?.userId,
        userName: options?.triggeredBy?.userName,
        action: options?.force ? 'ORDER_EMAIL_RESENT' : 'ORDER_EMAIL_SENT',
        entity: 'order',
        entityId: orderId,
        description: `Order confirmation email sent for ${order.orderNumber}`,
        status: 'SUCCESS',
        metadata: {
          orderNumber: order.orderNumber,
          recipients,
          notificationType: ORDER_CONFIRMED_TYPE,
          attempt: nextAttempt,
        },
      });
      return;
    }

    await this.prisma.orderEmailNotification.update({
      where: { id: record.id },
      data: {
        status: OrderEmailNotificationStatus.FAILED,
        attemptCount: nextAttempt,
        lastError: result.error ?? 'Email delivery failed',
      },
    });

    await this.audit.log({
      userId: options?.triggeredBy?.userId,
      userName: options?.triggeredBy?.userName,
      action: 'ORDER_EMAIL_FAILED',
      entity: 'order',
      entityId: orderId,
      description: `Order confirmation email failed for ${order.orderNumber}`,
      status: 'FAILED',
      severity: 'WARNING',
      metadata: {
        orderNumber: order.orderNumber,
        error: result.error,
        attempt: nextAttempt,
      },
    });

    if (nextAttempt < MAX_AUTO_ATTEMPTS && !options?.force) {
      this.logger.warn(
        `Retrying order email for ${order.orderNumber} (attempt ${nextAttempt + 1})`,
      );
      setTimeout(() => {
        void this.notifyOrderConfirmed(orderId);
      }, 5000 * nextAttempt);
    }
  }

  private async markFailed(
    recordId: string,
    error: string,
    orderNumber: string,
    orderId: string,
  ): Promise<void> {
    await this.prisma.orderEmailNotification.update({
      where: { id: recordId },
      data: {
        status: OrderEmailNotificationStatus.FAILED,
        attemptCount: { increment: 1 },
        lastError: error,
      },
    });
    await this.audit.log({
      action: 'ORDER_EMAIL_FAILED',
      entity: 'order',
      entityId: orderId,
      description: `Order confirmation email failed for ${orderNumber}`,
      status: 'FAILED',
      severity: 'WARNING',
      metadata: { error },
    });
  }

  private buildPayload(order: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    orderType: OrderEmailPayload['orderType'];
    orderSource: string;
    status: OrderEmailPayload['status'];
    customerName: string;
    customerPhone: string;
    deliveryAddress: string | null;
    deliveryInstructions: string | null;
    tokenNumber: number | null;
    scheduledDeliveryAt: Date | null;
    subtotal: { toNumber?: () => number } | number;
    deliveryCharge: { toNumber?: () => number } | number;
    packingCharge: { toNumber?: () => number } | number;
    preOrderDiscount: { toNumber?: () => number } | number;
    discount: { toNumber?: () => number } | number;
    taxAmount: { toNumber?: () => number } | number;
    grandTotal: { toNumber?: () => number } | number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    items: {
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: { toNumber?: () => number } | number;
      totalPrice: { toNumber?: () => number } | number;
    }[];
    posTable?: { label: string } | null;
  }): OrderEmailPayload {
    const toNum = (v: { toNumber?: () => number } | number) =>
      typeof v === 'number' ? v : Number(v);

    const websiteUrl =
      this.config.get<string>('NEXT_PUBLIC_WEBSITE_URL') ||
      this.config.get<string>('SITE_URL') ||
      'https://mercydosahouse.com';
    const adminUrl =
      this.config.get<string>('NEXT_PUBLIC_ADMIN_URL') ||
      this.config.get<string>('ADMIN_URL') ||
      'https://admin.mercydosahouse.com';

    return {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      orderType: order.orderType,
      orderSource: order.orderSource,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryInstructions: order.deliveryInstructions,
      tableLabel: order.posTable?.label ?? null,
      tokenNumber: order.tokenNumber,
      scheduledDeliveryAt: order.scheduledDeliveryAt,
      items: order.items.map((item) => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: toNum(item.unitPrice),
        totalPrice: toNum(item.totalPrice),
      })),
      subtotal: toNum(order.subtotal),
      deliveryCharge: toNum(order.deliveryCharge),
      packingCharge: toNum(order.packingCharge),
      preOrderDiscount: toNum(order.preOrderDiscount),
      discount: toNum(order.discount),
      taxAmount: toNum(order.taxAmount),
      grandTotal: toNum(order.grandTotal),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      adminOrderUrl: `${adminUrl.replace(/\/$/, '')}/orders?orderId=${encodeURIComponent(order.id)}`,
      logoUrl: `${websiteUrl.replace(/\/$/, '')}/images/logo.png`,
    };
  }

  mapNotification(
    record: {
      status: OrderEmailNotificationStatus;
      attemptCount: number;
      lastError: string | null;
      sentAt: Date | null;
      recipients: string[];
      updatedAt: Date;
    } | null,
  ) {
    if (!record) {
      return {
        status: 'PENDING' as const,
        attemptCount: 0,
        lastError: null,
        sentAt: null,
        recipients: this.getRecipients(),
      };
    }
    return {
      status: record.status,
      attemptCount: record.attemptCount,
      lastError: record.lastError,
      sentAt: record.sentAt?.toISOString() ?? null,
      recipients: record.recipients,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
