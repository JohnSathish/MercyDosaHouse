import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'mdh.admin.notificationPrefs.v1';
const INBOX_KEY = 'mdh.admin.orderInbox.v1';
const PLAYED_KEY = 'mdh.admin.playedOrderAlerts.v1';

export type NotificationPrefs = {
  enabled: boolean;
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  /** 0–1 */
  volume: number;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  ringtoneEnabled: true,
  vibrationEnabled: true,
  volume: 1,
};

export type OrderAlertItem = {
  orderId: string;
  orderNumber: string;
  customerName?: string;
  orderType?: string;
  amount?: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
};

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function loadOrderInbox(): Promise<OrderAlertItem[]> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as OrderAlertItem[];
    return Array.isArray(list) ? list.slice(0, 100) : [];
  } catch {
    return [];
  }
}

export async function upsertOrderAlert(item: OrderAlertItem): Promise<OrderAlertItem[]> {
  const list = await loadOrderInbox();
  const next = [item, ...list.filter((x) => x.orderId !== item.orderId)].slice(0, 100);
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
  return next;
}

export async function markOrderAlertRead(orderId: string): Promise<void> {
  const list = await loadOrderInbox();
  const next = list.map((x) => (x.orderId === orderId ? { ...x, read: true } : x));
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(next));
}

export async function hasPlayedOrderAlert(orderId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PLAYED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(orderId);
  } catch {
    return false;
  }
}

export async function markOrderAlertPlayed(orderId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PLAYED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (ids.includes(orderId)) return;
    const next = [orderId, ...ids].slice(0, 200);
    await AsyncStorage.setItem(PLAYED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
