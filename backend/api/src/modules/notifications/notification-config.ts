export type CustomerStatusKey =
  'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type NotificationTemplate = { title: string; body: string };

export type NotificationConfig = {
  newOrderEnabled: boolean;
  newOrderSound: boolean;
  vibration: boolean;
  customerStatusEnabled: boolean;
  statusEnabled: Record<CustomerStatusKey, boolean>;
  newOrderTemplate: NotificationTemplate;
  statusTemplates: Record<CustomerStatusKey, NotificationTemplate>;
};

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  newOrderEnabled: true,
  newOrderSound: true,
  vibration: true,
  customerStatusEnabled: true,
  statusEnabled: {
    PENDING: true,
    ACCEPTED: true,
    PREPARING: true,
    READY: true,
    OUT_FOR_DELIVERY: true,
    DELIVERED: true,
    CANCELLED: true,
  },
  newOrderTemplate: {
    title: '🔔 New Order Received!',
    body: 'Order #{{ORDER_NUMBER}} — ₹{{AMOUNT}} — Tap to view',
  },
  statusTemplates: {
    PENDING: {
      title: '🛎️ Order Received',
      body: "We've received your order #{{ORDER_NUMBER}}. Thank you for ordering from Mercy Dosa House!",
    },
    ACCEPTED: {
      title: '✅ Order Confirmed',
      body: 'Your order #{{ORDER_NUMBER}} has been confirmed and will be prepared shortly.',
    },
    PREPARING: {
      title: '👨‍🍳 Your Order Is Being Prepared',
      body: 'Our kitchen has started preparing your order. Fresh and delicious!',
    },
    READY: {
      title: '🍽️ Your Order Is Ready',
      body: 'Your order #{{ORDER_NUMBER}} is ready for pickup/delivery.',
    },
    OUT_FOR_DELIVERY: {
      title: '🛵 On the Way!',
      body: 'Your order #{{ORDER_NUMBER}} is on its way to you.',
    },
    DELIVERED: {
      title: '❤️ Order Delivered',
      body: 'Your order has been delivered. Thank you for choosing Mercy Dosa House!',
    },
    CANCELLED: {
      title: '❌ Order Cancelled',
      body: 'Your order #{{ORDER_NUMBER}} has been cancelled. Please contact us if you need assistance.',
    },
  },
};

export function applyNotificationTemplate(
  template: string,
  vars: { ORDER_NUMBER?: string; AMOUNT?: string },
): string {
  return template
    .replaceAll('{{ORDER_NUMBER}}', vars.ORDER_NUMBER ?? '')
    .replaceAll('{{AMOUNT}}', vars.AMOUNT ?? '');
}

function asTemplate(raw: unknown, fallback: NotificationTemplate): NotificationTemplate {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    title: typeof o.title === 'string' && o.title.trim() ? o.title : fallback.title,
    body: typeof o.body === 'string' && o.body.trim() ? o.body : fallback.body,
  };
}

export function parseNotificationConfig(raw: unknown): NotificationConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const enabled = (
    o.statusEnabled && typeof o.statusEnabled === 'object' ? o.statusEnabled : {}
  ) as Record<string, unknown>;
  const templates = (
    o.statusTemplates && typeof o.statusTemplates === 'object' ? o.statusTemplates : {}
  ) as Record<string, unknown>;
  const keys: CustomerStatusKey[] = [
    'PENDING',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ];
  const statusEnabled = { ...DEFAULT_NOTIFICATION_CONFIG.statusEnabled };
  const statusTemplates = { ...DEFAULT_NOTIFICATION_CONFIG.statusTemplates };
  for (const key of keys) {
    if (typeof enabled[key] === 'boolean') statusEnabled[key] = enabled[key];
    statusTemplates[key] = asTemplate(
      templates[key],
      DEFAULT_NOTIFICATION_CONFIG.statusTemplates[key],
    );
  }
  return {
    newOrderEnabled: o.newOrderEnabled !== false,
    newOrderSound: o.newOrderSound !== false,
    vibration: o.vibration !== false,
    customerStatusEnabled: o.customerStatusEnabled !== false,
    statusEnabled,
    newOrderTemplate: asTemplate(o.newOrderTemplate, DEFAULT_NOTIFICATION_CONFIG.newOrderTemplate),
    statusTemplates,
  };
}
