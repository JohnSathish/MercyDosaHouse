import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type OrderPushData = {
  type?: string;
  orderId?: string;
  orderNumber?: string;
};

async function ensureCustomerChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('order_updates', {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    sound: 'default',
  });
}

function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

export function useCustomerPush() {
  const router = useRouter();
  const handledLaunch = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let subResponse: Notifications.Subscription | undefined;
    let subReceived: Notifications.Subscription | undefined;

    const openOrder = (data: OrderPushData) => {
      if (data?.orderNumber) {
        router.push(`/track/${encodeURIComponent(data.orderNumber)}`);
      }
    };

    (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      try {
        await ensureCustomerChannel();
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
        if (!tokenData.data || cancelled) return;
        await api.post('/notifications/device-token', {
          token: tokenData.data,
          platform: Platform.OS,
        });
      } catch {
        /* emulator / permission */
      }
    })();

    subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
      openOrder((response.notification.request.content.data ?? {}) as OrderPushData);
    });
    subReceived = Notifications.addNotificationReceivedListener(() => undefined);

    if (!handledLaunch.current) {
      handledLaunch.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && !cancelled) {
          openOrder((response.notification.request.content.data ?? {}) as OrderPushData);
        }
      });
    }

    return () => {
      cancelled = true;
      subResponse?.remove();
      subReceived?.remove();
    };
  }, [router]);
}
