import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'MANAGER',
  'KITCHEN_STAFF',
  'CASHIER',
  'DELIVERY_STAFF',
] as const;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(params: {
    userId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data as object,
      },
    });

    if (params.userId) {
      const tokens = await this.prisma.deviceToken.findMany({ where: { userId: params.userId } });
      await this.sendExpoPush(
        tokens.map((t) => t.token),
        params.title,
        params.body,
        params.data,
      );
    }

    return notification;
  }

  /**
   * Alert staff devices when a customer places (or pays for) an order.
   * Uses Expo Push API for Expo tokens; also stores an in-app notification row per staff user.
   */
  async notifyStaffNewOrder(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return;

      const staff = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { name: { in: [...STAFF_ROLES] } },
        },
        select: { id: true },
      });
      if (!staff.length) return;

      const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
      const title = 'New order received';
      const body = `${order.orderNumber} · ${itemCount} item${itemCount === 1 ? '' : 's'} · ₹${Number(order.grandTotal).toFixed(0)} · ${order.customerName || order.customerPhone}`;
      const data = {
        type: 'NEW_ORDER',
        orderId: order.id,
        orderNumber: order.orderNumber,
        screen: 'orders',
      };

      const staffIds = staff.map((s) => s.id);
      await this.prisma.notification.createMany({
        data: staffIds.map((userId) => ({
          userId,
          type: NotificationType.ORDER_CONFIRMED,
          title,
          body,
          data,
        })),
      });

      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: staffIds } },
        select: { token: true },
      });

      await this.sendExpoPush(
        tokens.map((t) => t.token),
        title,
        body,
        data,
      );

      this.logger.log(
        `Staff push for ${order.orderNumber}: ${tokens.length} device token(s), ${staffIds.length} staff`,
      );
    } catch (err) {
      this.logger.error(
        `Failed staff push for order ${orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  registerDevice(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform },
      create: { userId, token, platform },
    });
  }

  private async sendExpoPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const expoTokens = [...new Set(tokens.filter((t) => t.startsWith('ExponentPushToken')))];
    if (!expoTokens.length) {
      if (tokens.length) {
        this.logger.warn(
          `Skipping push: ${tokens.length} token(s) are not Expo push tokens (FCM direct not configured)`,
        );
      }
      return;
    }

    const messages = expoTokens.map((to) => ({
      to,
      sound: 'default' as const,
      title,
      body,
      data: data ?? {},
      channelId: 'orders',
      priority: 'high' as const,
    }));

    // Expo accepts up to 100 messages per request
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          this.logger.warn(`Expo push HTTP ${res.status}: ${text.slice(0, 300)}`);
          continue;
        }
        const json = (await res.json()) as { data?: { status?: string; message?: string }[] };
        const errors = (json.data ?? []).filter((d) => d.status === 'error');
        if (errors.length) {
          this.logger.warn(`Expo push errors: ${JSON.stringify(errors).slice(0, 500)}`);
        }
      } catch (err) {
        this.logger.warn(
          `Expo push request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
