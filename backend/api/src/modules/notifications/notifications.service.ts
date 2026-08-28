import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { NotificationType, OrderSource, OrderStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FcmSender } from './fcm.sender';
import {
  applyNotificationTemplate,
  DEFAULT_NOTIFICATION_CONFIG,
  parseNotificationConfig,
  type CustomerStatusKey,
  type NotificationConfig,
} from './notification-config';

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

const STATUS_TO_TYPE: Record<CustomerStatusKey, NotificationType> = {
  PENDING: NotificationType.ORDER_PLACED,
  ACCEPTED: NotificationType.ORDER_CONFIRMED,
  PREPARING: NotificationType.PREPARING,
  READY: NotificationType.READY,
  ASSIGNED: NotificationType.ASSIGNED,
  PICKED_UP: NotificationType.PICKED_UP,
  OUT_FOR_DELIVERY: NotificationType.OUT_FOR_DELIVERY,
  DELIVERED: NotificationType.DELIVERED,
  CANCELLED: NotificationType.CANCELLED,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private fcm: FcmSender,
  ) {}

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
      await this.dispatchPush(
        tokens.map((t) => t.token),
        {
          title: params.title,
          body: params.body,
          data: params.data,
          channelId: 'order_updates',
          sound: 'default',
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
    await this.saveJsonSetting('staffPushConfig', next);
    return next;
  }

  async getNotificationConfig(): Promise<NotificationConfig> {
    const settings = await this.prisma.businessSettings.findFirst();
    return parseNotificationConfig(
      (settings as { notificationConfig?: unknown } | null)?.notificationConfig,
    );
  }

  async updateNotificationConfig(patch: Record<string, unknown>): Promise<NotificationConfig> {
    const current = await this.getNotificationConfig();
    const next = parseNotificationConfig({
      ...current,
      ...patch,
      statusEnabled: {
        ...current.statusEnabled,
        ...((patch.statusEnabled as object) || {}),
      },
      statusTemplates: {
        ...current.statusTemplates,
        ...((patch.statusTemplates as object) || {}),
      },
    });
    await this.saveJsonSetting('notificationConfig', next);
    return next;
  }

  async notifyStaffNewOrder(orderId: string): Promise<void> {
    try {
      if (!(await this.claimDispatch(`staff:new-order:${orderId}`))) return;

      const staffCfg = await this.getStaffPushConfig();
      const notifyCfg = await this.getNotificationConfig();
      if (!staffCfg.enabled || !notifyCfg.newOrderEnabled) return;

      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return;

      const restaurant = await this.prisma.businessSettings.findFirst({
        select: { storeOpen: true },
      });
      if (restaurant && restaurant.storeOpen === false && order.orderSource !== OrderSource.POS) {
        return;
      }

      const roles = (
        staffCfg.recipientRoles.length
          ? staffCfg.recipientRoles
          : DEFAULT_STAFF_PUSH_CONFIG.recipientRoles
      ).filter((r): r is UserRole => (Object.values(UserRole) as string[]).includes(r));

      const staff = await this.prisma.user.findMany({
        where: { isActive: true, role: { name: { in: roles } } },
        select: { id: true },
      });
      if (!staff.length) return;

      const amount = `${Math.round(Number(order.grandTotal))}`;
      const vars = { ORDER_NUMBER: order.orderNumber, AMOUNT: amount };
      const title = applyNotificationTemplate(notifyCfg.newOrderTemplate.title, vars);
      const body = applyNotificationTemplate(notifyCfg.newOrderTemplate.body, vars);
      const customer = order.customerName || order.customerPhone || 'Customer';
      const data = {
        type: 'NEW_ORDER',
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: customer,
        orderType: String(order.orderType ?? 'DELIVERY'),
        amount: `₹${amount}`,
        grandTotal: Number(order.grandTotal),
        screen: 'orders',
        channelId: staffCfg.channelId,
        soundName: staffCfg.soundName,
        ringtoneEnabled: staffCfg.ringtoneEnabled && notifyCfg.newOrderSound,
        vibrationEnabled: staffCfg.vibrationEnabled && notifyCfg.vibration,
      };

      const staffIds = staff.map((s) => s.id);
      await this.prisma.notification.createMany({
        data: staffIds.map((userId) => ({
          userId,
          type: NotificationType.NEW_ORDER,
          title,
          body,
          data,
        })),
      });

      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: staffIds } },
        select: { token: true },
      });

      await this.dispatchPush(
        tokens.map((t) => t.token),
        {
          title,
          body,
          data,
          channelId: staffCfg.channelId,
          sound:
            staffCfg.ringtoneEnabled && notifyCfg.newOrderSound
              ? `${staffCfg.soundName}.wav`
              : null,
          collapseId: `new-order-${order.id}`,
          subtitle: `${customer} · ${order.orderType} · ₹${amount}`,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed staff push for order ${orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async notifyCustomerOrderPlaced(orderId: string): Promise<void> {
    await this.notifyCustomerStatus(orderId, OrderStatus.PENDING);
  }

  async notifyCustomerStatus(
    orderId: string,
    status: OrderStatus | 'ASSIGNED' | 'PICKED_UP',
    options?: { previousStatus?: string | null; reason?: string },
  ): Promise<void> {
    try {
      const key = status === 'ASSIGNED' || status === 'PICKED_UP' ? status : this.statusKey(status);
      if (!key) return;

      const cfg = await this.getNotificationConfig();
      if (!cfg.customerStatusEnabled || !cfg.statusEnabled[key]) return;

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, userId: true, grandTotal: true, orderType: true },
      });
      if (!order?.userId) return;

      const vars = {
        ORDER_NUMBER: order.orderNumber,
        AMOUNT: String(Math.round(Number(order.grandTotal))),
        REASON: options?.reason ? `Reason: ${options.reason}` : '',
      };
      const tpl = cfg.statusTemplates[key];
      const title = applyNotificationTemplate(tpl.title, vars);
      const body = applyNotificationTemplate(tpl.body, vars);
      const data = {
        type: 'ORDER_STATUS',
        status: key,
        orderId: order.id,
        orderNumber: order.orderNumber,
        screen: 'track',
        channelId: 'order_updates',
      };

      const dedupeKey = `customer:status:${orderId}:${options?.previousStatus ?? 'NONE'}:${key}`;
      const event = await this.prisma
        .$transaction(async (tx) => {
          const dispatch = await tx.pushDispatch.create({
            data: {
              dedupeKey,
              orderId,
              previousStatus: options?.previousStatus ?? null,
              newStatus: key,
              notificationType: STATUS_TO_TYPE[key],
              deliveryStatus: 'PENDING',
            },
          });
          const notification = await tx.notification.create({
            data: {
              userId: order.userId,
              type: STATUS_TO_TYPE[key],
              title,
              body,
              data,
            },
          });
          await tx.pushDispatch.update({
            where: { id: dispatch.id },
            data: { notificationId: notification.id },
          });
          return { dispatchId: dispatch.id, notificationId: notification.id };
        })
        .catch((error: unknown) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return null;
          }
          throw error;
        });
      if (!event) return;

      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: order.userId },
        select: { token: true },
      });
      if (!tokens.length) {
        await this.prisma.pushDispatch.update({
          where: { id: event.dispatchId },
          data: {
            deliveryStatus: 'NO_TOKEN',
            lastError: 'Customer device token unavailable',
            attempts: { increment: 1 },
          },
        });
        return;
      }
      const result = await this.dispatchPush(
        tokens.map((t) => t.token),
        {
          title,
          body,
          data,
          channelId: 'order_updates',
          sound: 'default',
          collapseId: `order-status-${order.id}-${key}`,
        },
      );
      await this.prisma.pushDispatch.update({
        where: { id: event.dispatchId },
        data: {
          deliveryStatus: result.status,
          lastError: result.error,
          attempts: { increment: 1 },
          sentAt: result.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed customer push for order ${orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async notifyCustomerNearby(orderId: string): Promise<void> {
    try {
      if (!(await this.claimDispatch(`customer:nearby:${orderId}`))) return;
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true, userId: true },
      });
      if (!order?.userId) return;
      const title = '📍 Almost There!';
      const body = 'Your Mercy Dosa House delivery partner is nearby.';
      const data = {
        type: 'NEAR_CUSTOMER',
        orderId: order.id,
        orderNumber: order.orderNumber,
        screen: 'track',
        channelId: 'order_updates',
      };
      await this.prisma.notification.create({
        data: { userId: order.userId, type: NotificationType.NEAR_CUSTOMER, title, body, data },
      });
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: order.userId },
        select: { token: true },
      });
      await this.dispatchPush(
        tokens.map((token) => token.token),
        {
          title,
          body,
          data,
          channelId: 'order_updates',
          sound: 'default',
          collapseId: `order-nearby-${order.id}`,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed nearby notification for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getOrderNotificationLogs() {
    const dispatches = await this.prisma.pushDispatch.findMany({
      where: { orderId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const orderIds = dispatches
      .map((dispatch) => dispatch.orderId)
      .filter((id): id is string => Boolean(id));
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, orderNumber: true, customerName: true },
    });
    const byId = new Map(orders.map((order) => [order.id, order]));
    return dispatches.map((dispatch) => ({
      id: dispatch.id,
      orderNumber: dispatch.orderId
        ? (byId.get(dispatch.orderId)?.orderNumber ?? dispatch.orderId)
        : null,
      customerName: dispatch.orderId ? (byId.get(dispatch.orderId)?.customerName ?? null) : null,
      event: dispatch.newStatus,
      previousStatus: dispatch.previousStatus,
      notificationType: dispatch.notificationType,
      status: dispatch.deliveryStatus,
      error: dispatch.lastError,
      attempts: dispatch.attempts,
      createdAt: dispatch.createdAt.toISOString(),
      sentAt: dispatch.sentAt?.toISOString() ?? null,
    }));
  }

  async retryOrderNotification(dispatchId: string) {
    const dispatch = await this.prisma.pushDispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch?.notificationId) return { ok: false, reason: 'Notification event not found' };
    const notification = await this.prisma.notification.findUnique({
      where: { id: dispatch.notificationId },
    });
    if (!notification?.userId)
      return { ok: false, reason: 'Customer notification recipient not found' };
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: notification.userId },
      select: { token: true },
    });
    if (!tokens.length) {
      await this.prisma.pushDispatch.update({
        where: { id: dispatch.id },
        data: {
          deliveryStatus: 'NO_TOKEN',
          lastError: 'Customer device token unavailable',
          attempts: { increment: 1 },
        },
      });
      return { ok: false, reason: 'Customer device token unavailable' };
    }
    const result = await this.dispatchPush(
      tokens.map((token) => token.token),
      {
        title: notification.title,
        body: notification.body,
        data: (notification.data as Record<string, unknown> | null) ?? undefined,
        channelId: 'order_updates',
        sound: 'default',
        collapseId: `retry-${dispatch.id}`,
      },
    );
    await this.prisma.pushDispatch.update({
      where: { id: dispatch.id },
      data: {
        deliveryStatus: result.status,
        lastError: result.error,
        attempts: { increment: 1 },
        sentAt: result.status === 'SENT' ? new Date() : dispatch.sentAt,
      },
    });
    return { ok: result.status === 'SENT', status: result.status };
  }

  getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
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

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
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
    return this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
  }

  registerDevice(userId: string, token: string, platform: string) {
    if (!token?.trim() || !platform?.trim()) {
      throw new BadRequestException('A device token and platform are required');
    }
    return this.prisma.$transaction(async (tx) => {
      if (platform.toLowerCase() === 'android' && !token.startsWith('ExponentPushToken')) {
        await tx.deviceToken.deleteMany({
          where: { userId, token: { startsWith: 'ExponentPushToken' } },
        });
      }
      await tx.deviceToken.deleteMany({ where: { token, userId: { not: userId } } });
      return tx.deviceToken.upsert({
        where: { userId_token: { userId, token } },
        update: { platform },
        create: { userId, token, platform },
      });
    });
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  async sendTestPushToUser(userId: string) {
    const config = await this.getStaffPushConfig();
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    const title = '🔔 New Order Received!';
    const body = 'Order #MDH-TEST-000001 — ₹199 — Tap to view';
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
    await this.dispatchPush(
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

  private statusKey(status: OrderStatus): CustomerStatusKey | null {
    if (status === OrderStatus.SERVED) return 'READY';
    const keys: CustomerStatusKey[] = [
      'PENDING',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'ASSIGNED',
      'PICKED_UP',
    ];
    return keys.includes(status as CustomerStatusKey) ? (status as CustomerStatusKey) : null;
  }

  private async claimDispatch(dedupeKey: string): Promise<boolean> {
    try {
      await this.prisma.pushDispatch.create({ data: { dedupeKey } });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false;
      }
      this.logger.warn(`Push dedupe failed for ${dedupeKey}`);
      return true;
    }
  }

  private async saveJsonSetting(field: 'staffPushConfig' | 'notificationConfig', value: unknown) {
    const existing = await this.prisma.businessSettings.findFirst({ select: { id: true } });
    const data = { [field]: value } as Prisma.BusinessSettingsUpdateInput;
    if (existing) {
      await this.prisma.businessSettings.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.businessSettings.create({
        data: { [field]: value } as Prisma.BusinessSettingsCreateInput,
      });
    }
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

  private async dispatchPush(
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
  ): Promise<{ status: 'SENT' | 'PARTIAL' | 'FAILED' | 'NO_TOKEN'; error?: string }> {
    const unique = [...new Set(tokens.filter(Boolean))];
    const expoTokens = unique.filter((t) => t.startsWith('ExponentPushToken'));
    const fcmTokens = unique.filter((t) => !t.startsWith('ExponentPushToken'));
    if (!unique.length) return { status: 'NO_TOKEN', error: 'No registered device token' };
    let sent = false;
    let failed = false;

    if (expoTokens.length) {
      const result = await this.sendExpoPush(expoTokens, message);
      sent = sent || result.ok;
      failed = failed || !result.ok;
    }
    if (fcmTokens.length) {
      if (!this.fcm.isConfigured()) {
        failed = true;
      } else {
        try {
          const result = await this.fcm.send(fcmTokens, message);
          sent = sent || result.sent > 0;
          failed = failed || result.failed > 0;
          if (result.invalid.length) {
            await this.prisma.deviceToken.deleteMany({
              where: { token: { in: result.invalid } },
            });
          }
        } catch (error) {
          failed = true;
          return {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'FCM send failed',
          };
        }
      }
    }
    return sent && !failed
      ? { status: 'SENT' }
      : sent
        ? { status: 'PARTIAL', error: 'At least one device delivery failed' }
        : { status: 'FAILED', error: 'Push provider is not configured or unavailable' };
  }

  private async sendExpoPush(
    expoTokens: string[],
    message: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId: string;
      sound: string | null;
      collapseId?: string;
      subtitle?: string;
    },
  ): Promise<{ ok: boolean }> {
    let ok = true;
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
          this.logger.warn(`Expo push HTTP ${res.status}`);
          ok = false;
          continue;
        }
        const json = (await res.json()) as {
          data?: { status?: string; message?: string; details?: { error?: string } }[];
        };
        if (!json.data || json.data.length !== chunk.length) ok = false;
        const stale: string[] = [];
        (json.data ?? []).forEach((d, idx) => {
          if (d.status === 'error') ok = false;
          if (d.status === 'error' && d.details?.error === 'DeviceNotRegistered') {
            stale.push(chunk[idx].to);
          }
        });
        if (stale.length) {
          await this.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
        }
      } catch (err) {
        ok = false;
        this.logger.warn(
          `Expo push request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { ok };
  }
}
