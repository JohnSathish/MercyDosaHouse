export interface OrderNotificationRecipientDto {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertOrderNotificationRecipientDto {
  email: string;
}

export type InboxCategory = 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'CUSTOMER' | 'DELIVERY' | 'SYSTEM';

export type InboxPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface InboxNotificationDto {
  id: string;
  type: string;
  category: InboxCategory;
  priority: InboxPriority;
  title: string;
  body: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  href: string | null;
  androidPath: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface InboxListDto {
  data: InboxNotificationDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface NotificationPreferenceDto {
  newOrders: boolean;
  orderStatus: boolean;
  payments: boolean;
  lowStock: boolean;
  expiryAlerts: boolean;
  customerFeedback: boolean;
  deliveryAlerts: boolean;
  systemAlerts: boolean;
  pushEnabled: boolean;
  newOrderSound: boolean;
  vibration: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceDto = {
  newOrders: true,
  orderStatus: true,
  payments: true,
  lowStock: true,
  expiryAlerts: true,
  customerFeedback: true,
  deliveryAlerts: true,
  systemAlerts: true,
  pushEnabled: true,
  newOrderSound: true,
  vibration: true,
};
