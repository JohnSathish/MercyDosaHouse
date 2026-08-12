import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import {
  hasPlayedOrderAlert,
  loadNotificationPrefs,
  markOrderAlertPlayed,
  markOrderAlertRead,
  upsertOrderAlert,
  type NotificationPrefs,
} from '@/lib/notification-prefs';
import { playNewOrderRingtone } from '@/lib/new-order-ringtone';

const NEW_ORDERS_CHANNEL = 'new_orders';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const prefs = await loadNotificationPrefs();
    return {
      shouldShowAlert: prefs.enabled,
      shouldPlaySound: prefs.enabled && prefs.ringtoneEnabled,
      shouldSetBadge: true,
      shouldShowBanner: prefs.enabled,
      shouldShowList: prefs.enabled,
    };
  },
});

function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

type OrderPushData = {
  type?: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  orderType?: string;
  amount?: string;
  isTest?: boolean;
};

async function ensureNewOrdersChannel(prefs: NotificationPrefs) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NEW_ORDERS_CHANNEL, {
    name: 'New orders',
    description: 'High-priority alerts when customers place orders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: prefs.vibrationEnabled ? [0, 400, 200, 400, 200, 400] : [0],
    enableVibrate: prefs.vibrationEnabled,
    // Filename without extension — matches expo-notifications plugin sound asset
    sound: prefs.ringtoneEnabled ? 'new_order' : undefined,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
  // Keep legacy channel for older payloads
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Orders (legacy)',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

async function handleIncomingOrderAlert(
  content: Notifications.NotificationContent,
  playSound: boolean,
) {
  const prefs = await loadNotificationPrefs();
  if (!prefs.enabled) return;

  const data = (content.data ?? {}) as OrderPushData;
  const orderId = data.orderId;
  if (!orderId || orderId === 'test') {
    if (playSound && data.isTest) await playNewOrderRingtone(prefs);
    return;
  }

  await upsertOrderAlert({
    orderId,
    orderNumber: data.orderNumber ?? orderId,
    customerName: data.customerName,
    orderType: data.orderType,
    amount: data.amount,
    title: content.title ?? '🔔 New Order Received!',
    body: content.body ?? '',
    receivedAt: new Date().toISOString(),
    read: false,
  });

  if (playSound) {
    const already = await hasPlayedOrderAlert(orderId);
    if (!already) {
      await markOrderAlertPlayed(orderId);
      await playNewOrderRingtone(prefs);
    }
  }
}

export function useAdminPushRegistration(enabled: boolean) {
  const registered = useRef(false);
  const handledLaunchResponse = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let subResponse: Notifications.Subscription | undefined;
    let subReceived: Notifications.Subscription | undefined;

    (async () => {
      try {
        const prefs = await loadNotificationPrefs();
        await ensureNewOrdersChannel(prefs);

        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted' || cancelled) return;

        const projectId = getProjectId();
        const tokenData = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (!token || cancelled) return;

        await api.post('/notifications/device-token', {
          token,
          platform: Platform.OS,
        });
        registered.current = true;
      } catch {
        /* Push may fail on emulator — ignore */
      }
    })();

    const openFromNotification = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as OrderPushData;
      if (data?.orderId && data.orderId !== 'test') {
        await markOrderAlertRead(data.orderId);
        void api
          .post('/notifications/read-by-order', { orderId: data.orderId })
          .catch(() => undefined);
        router.push(`/orders/${data.orderId}`);
      } else {
        router.push('/(tabs)/orders');
      }
    };

    subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      void openFromNotification(response);
    });

    subReceived = Notifications.addNotificationReceivedListener((notification) => {
      // Foreground: system banner + play bundled ringtone (once per order)
      void handleIncomingOrderAlert(notification.request.content, true);
    });

    if (!handledLaunchResponse.current) {
      handledLaunchResponse.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && !cancelled) void openFromNotification(response);
      });
    }

    return () => {
      cancelled = true;
      subReceived?.remove();
      subResponse?.remove();
    };
  }, [enabled, router]);
}

export { ensureNewOrdersChannel, NEW_ORDERS_CHANNEL };
