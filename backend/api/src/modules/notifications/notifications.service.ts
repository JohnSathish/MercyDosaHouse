import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, OrderSource, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type StaffPushConfig = {
  enabled: boolean;
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  recipientRoles: string[];
  channelId: string;
  soundName: string;
};

export const DEFAULT_STAFF_PUSH_CONFIG: StaffPushConfig = {
  enabled: true,
  ringtoneEnabled: true,
  vibrationEnabled: true,
  recipientRoles: ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF'],
  channelId: 'new_orders',
  soundName: 'new_order',
};

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
        {
          title: params.title,
          body: params.body,
          data: params.data,
          channelId: DEFAULT_STAFF_PUSH_CONFIG.channelId,
          sound: `${DEFAULT_STAFF_PUSH_CONFIG.soundName}.wav`,
          collapseId: undefined,
        },
      );
    }

    return notification;
  }

  async getStaffPushConfig(): Promise<StaffPushConfig> {
    const settings = await this.prisma.businessSettings.findFirst();
    const raw = (settings as { staffPushConfig?: unknown } | null)?.staffPushConfig;
    return this.mergeStaffPushConfig(raw);
  }

  async updateStaffPushConfig(patch: Partial<StaffPushConfig>): Promise<StaffPushConfig> {
    const current = await this.getStaffPushConfig();
    const next: StaffPushConfig = {
      ...current,
      ...patch,
      recipientRoles:
        patch.recipientRoles?.length && patch.recipientRoles.length > 0
          ? [...new Set(patch.recipientRoles.map((r) => r.trim().toUpperCase()).filter(Boolean))]
          : current.recipientRoles,
    };

    const existing = await this.prisma.businessSettings.findFirst({ select: { id: true } });
    if (existing) {
      await this.prisma.businessSettings.update({
        where: { id: existing.id },
        data: { staffPushConfig: next } as never,
      });
    } else {
      await this.prisma.businessSettings.create({
        data: { staffPushConfig: next } as never,
      });
    }
    return next;
  }

  /**
   * Alert staff devices when a customer places (or pays for) an order.
   * Skips when restaurant is closed for online/customer channels.
   */
  async notifyStaffNewOrder(orderId: string): Promise<void> {
    try {
      const config = await this.getStaffPushConfig();
      if (!config.enabled) {
        this.logger.debug('Staff push disabled — skipping');
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return;

      const restaurant = await this.prisma.businessSettings.findFirst({
        select: { storeOpen: true },
      });
      // Online/customer channels are already blocked when closed; skip push as a safeguard.
      if (restaurant && restaurant.storeOpen === false && order.orderSource !== OrderSource.POS) {
        this.logger.debug(`Store closed — skip push for ${order.orderNumber}`);
        return;
      }

      const roles = (
        config.recipientRoles.length
          ? config.recipientRoles
          : DEFAULT_STAFF_PUSH_CONFIG.recipientRoles
      ).filter((r): r is UserRole => (Object.values(UserRole) as string[]).includes(r));

      const staff = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { name: { in: roles } },
        },
        select: { id: true },
      });
      if (!staff.length) return;

      const amount = `₹${Number(order.grandTotal).toFixed(0)}`;
      const orderType = String(order.orderType ?? 'DELIVERY');
      const customer = order.customerName || order.customerPhone || 'Customer';
      const title = '🔔 New Order Received!';
      const body = `You have a new order #${order.orderNumber}. Tap to view the order.`;
      const data = {
        type: 'NEW_ORDER',
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: customer,
        orderType,
        amount,
        grandTotal: Number(order.grandTotal),
        screen: 'orders',
        channelId: config.channelId,
        soundName: config.soundName,
        ringtoneEnabled: config.ringtoneEnabled,
        vibrationEnabled: config.vibrationEnabled,
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
        {
          title,
          body,
          data,
          channelId: config.channelId,
          sound: config.ringtoneEnabled ? `${config.soundName}.wav` : null,
          // Unique per order so multiple orders stack; same order retries replace
          collapseId: `new-order-${order.id}`,
          subtitle: `${customer} · ${orderType} · ${amount}`,
        },
      );

      this.logger.log(
        `Staff push for ${order.orderNumber}: ${tokens.length} device(s), roles=${roles.join(',')}`,
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
      take: 80,
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markReadByOrderId(orderId: string, userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId, isRead: false },
      select: { id: true, data: true },
    });
    const ids = rows
      .filter((r) => {
        const data = r.data as { orderId?: string } | null;
        return data?.orderId === orderId;
      })
      .map((r) => r.id);
    if (!ids.length) return { count: 0 };
    const result = await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
    return result;
  }

  registerDevice(userId: string, token: string, platform: string) {
    return this.prisma.deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform },
      create: { userId, token, platform },
    });
  }

  async sendTestPushToUser(userId: string) {
    const config = await this.getStaffPushConfig();
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    const title = '🔔 New Order Received!';
    const body = 'You have a new order #MDH-TEST-000001. Tap to view the order.';
    const data = {
      type: 'NEW_ORDER',
      orderId: 'test',
      orderNumber: 'MDH-TEST-000001',
      customerName: 'Test Customer',
      orderType: 'DELIVERY',
      amount: '₹199',
      screen: 'orders',
      channelId: config.channelId,
      soundName: config.soundName,
      ringtoneEnabled: config.ringtoneEnabled,
      vibrationEnabled: config.vibrationEnabled,
      isTest: true,
    };
    await this.sendExpoPush(
      tokens.map((t) => t.token),
      {
        title,
        body,
        data,
        channelId: config.channelId,
        sound: config.ringtoneEnabled ? `${config.soundName}.wav` : null,
        collapseId: `test-${Date.now()}`,
        subtitle: 'Test Customer · DELIVERY · ₹199',
      },
    );
    return { ok: true, devices: tokens.length };
  }

  private mergeStaffPushConfig(raw: unknown): StaffPushConfig {
    const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<StaffPushConfig>;
    return {
      enabled: parsed.enabled ?? DEFAULT_STAFF_PUSH_CONFIG.enabled,
      ringtoneEnabled: parsed.ringtoneEnabled ?? DEFAULT_STAFF_PUSH_CONFIG.ringtoneEnabled,
      vibrationEnabled: parsed.vibrationEnabled ?? DEFAULT_STAFF_PUSH_CONFIG.vibrationEnabled,
      recipientRoles:
        Array.isArray(parsed.recipientRoles) && parsed.recipientRoles.length
          ? parsed.recipientRoles
          : DEFAULT_STAFF_PUSH_CONFIG.recipientRoles,
      channelId: parsed.channelId || DEFAULT_STAFF_PUSH_CONFIG.channelId,
      soundName: parsed.soundName || DEFAULT_STAFF_PUSH_CONFIG.soundName,
    };
  }

  private async sendExpoPush(
    tokens: string[],
    message: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId: string;
      sound: string | null;
      collapseId?: string;
      subtitle?: string;
    },
  ) {
    const expoTokens = [...new Set(tokens.filter((t) => t.startsWith('ExponentPushToken')))];
    if (!expoTokens.length) {
      if (tokens.length) {
        this.logger.warn(
          `Skipping push: ${tokens.length} token(s) are not Expo push tokens (configure FCM credentials for bare tokens)`,
        );
      }
      return;
    }

    const messages = expoTokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      subtitle: message.subtitle,
      data: message.data ?? {},
      sound: message.sound === null ? null : message.sound || 'default',
      channelId: message.channelId,
      priority: 'high' as const,
      collapseId: message.collapseId,
      mutableContent: true,
    }));

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
