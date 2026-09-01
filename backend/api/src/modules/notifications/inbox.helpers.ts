import { NotificationType, UserRole } from '@prisma/client';
import type { InboxCategory, InboxPriority, NotificationPreferenceDto } from '@mdh/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@mdh/types';

export type StaffInboxInput = {
  eventKey: string;
  type: NotificationType;
  category: InboxCategory;
  priority?: InboxPriority;
  title: string;
  body: string;
  referenceType?: string;
  referenceId?: string;
  href?: string;
  androidPath?: string;
  metadata?: Record<string, unknown>;
  roles?: UserRole[];
  extraUserIds?: string[];
  playNewOrderSound?: boolean;
};

export const CATEGORY_ROLES: Record<InboxCategory, UserRole[]> = {
  ORDER: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.KITCHEN_STAFF, UserRole.CASHIER],
  PAYMENT: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  INVENTORY: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
  CUSTOMER: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
  DELIVERY: [UserRole.SUPER_ADMIN, UserRole.MANAGER],
  SYSTEM: [UserRole.SUPER_ADMIN],
};

export function prefAllows(prefs: NotificationPreferenceDto, input: StaffInboxInput): boolean {
  if (input.category === 'ORDER') {
    return input.type === NotificationType.NEW_ORDER ? prefs.newOrders : prefs.orderStatus;
  }
  if (input.category === 'PAYMENT') return prefs.payments;
  if (input.category === 'INVENTORY') {
    if (input.type === NotificationType.INVENTORY_EXPIRY) return prefs.expiryAlerts;
    return prefs.lowStock;
  }
  if (input.category === 'CUSTOMER') return prefs.customerFeedback;
  if (input.category === 'DELIVERY') return prefs.deliveryAlerts;
  return prefs.systemAlerts;
}

export function mergePrefs(
  raw: Partial<NotificationPreferenceDto> | null,
): NotificationPreferenceDto {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...raw };
}

export function hrefForNotification(input: {
  category: string;
  type: string;
  referenceType?: string | null;
  referenceId?: string | null;
  data?: Record<string, unknown> | null;
}): { href: string | null; androidPath: string | null } {
  const id = input.referenceId || '';
  const fromData = (input.data?.href as string | undefined) || null;
  const androidFromData = (input.data?.androidPath as string | undefined) || null;
  if (fromData || androidFromData) return { href: fromData, androidPath: androidFromData };

  switch (input.category) {
    case 'ORDER':
    case 'PAYMENT':
      return {
        href: id ? `/orders?orderId=${id}` : '/orders',
        androidPath: id ? `/orders/${id}` : '/(tabs)/orders',
      };
    case 'INVENTORY':
      if (input.type === 'PURCHASE_ORDER') {
        return { href: '/inventory/purchase-orders', androidPath: '/inventory/purchase-orders' };
      }
      if (input.type === 'INVENTORY_EXPIRY') {
        return { href: '/inventory/expiry', androidPath: '/inventory/expiry' };
      }
      if (input.type === 'INVENTORY_OUT' || input.type === 'INVENTORY') {
        return {
          href: id ? `/inventory/ingredients?itemId=${id}` : '/inventory/low-stock',
          androidPath: id ? `/inventory/item-form?id=${id}` : '/inventory/low-stock',
        };
      }
      return { href: '/inventory', androidPath: '/inventory' };
    case 'CUSTOMER':
      if (input.type === 'REVIEW') {
        return {
          href: id ? `/feedback?reviewId=${id}` : '/feedback',
          androidPath: '/customers',
        };
      }
      return {
        href: id ? `/customers?userId=${id}` : '/customers',
        androidPath: id ? `/customers/${id}` : '/customers',
      };
    case 'DELIVERY':
      return {
        href: id ? `/delivery/tracking?orderId=${id}` : '/delivery/tracking',
        androidPath: '/delivery',
      };
    case 'SYSTEM':
      return { href: '/settings', androidPath: '/settings' };
    default:
      return { href: '/notifications', androidPath: '/notifications' };
  }
}

export const ORDER_STATUS_STAFF: Record<
  string,
  { title: string; body: (orderNumber: string) => string; type: NotificationType }
> = {
  ACCEPTED: {
    title: '✅ Order accepted',
    body: (n) => `Order #${n} was accepted.`,
    type: NotificationType.ORDER_CONFIRMED,
  },
  PREPARING: {
    title: '👨‍🍳 Order preparing',
    body: (n) => `Kitchen started preparing order #${n}.`,
    type: NotificationType.PREPARING,
  },
  READY: {
    title: '📦 Order ready',
    body: (n) => `Order #${n} is ready.`,
    type: NotificationType.READY,
  },
  PICKED_UP: {
    title: '🚴 Order picked up',
    body: (n) => `Order #${n} has been picked up.`,
    type: NotificationType.PICKED_UP,
  },
  OUT_FOR_DELIVERY: {
    title: '🛵 Order out for delivery',
    body: (n) => `Order #${n} is out for delivery.`,
    type: NotificationType.OUT_FOR_DELIVERY,
  },
  DELIVERED: {
    title: '✅ Order delivered',
    body: (n) => `Order #${n} was delivered.`,
    type: NotificationType.DELIVERED,
  },
  CANCELLED: {
    title: '❌ Order cancelled',
    body: (n) => `Order #${n} was cancelled.`,
    type: NotificationType.CANCELLED,
  },
  ASSIGNED: {
    title: '🚴 Delivery assigned',
    body: (n) => `A delivery partner was assigned to order #${n}.`,
    type: NotificationType.ASSIGNED,
  },
};
