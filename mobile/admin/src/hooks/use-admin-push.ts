import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
  );
}

export function useAdminPushRegistration(enabled: boolean) {
  const registered = useRef(false);
  const handledLaunchResponse = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let subResponse: Notifications.Subscription | undefined;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('orders', {
            name: 'New orders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableVibrate: true,
          });
        }

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

        if (!registered.current) {
          await api.post('/notifications/device-token', {
            token,
            platform: Platform.OS,
          });
          registered.current = true;
        }
      } catch {
        /* Push may fail on emulator / missing credentials — ignore */
      }
    })();

    const openFromNotification = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as {
        orderId?: string;
        screen?: string;
      };
      if (data?.orderId) {
        router.push(`/orders/${data.orderId}`);
      } else {
        router.push('/(tabs)/orders');
      }
    };

    subResponse = Notifications.addNotificationResponseReceivedListener(openFromNotification);

    if (!handledLaunchResponse.current) {
      handledLaunchResponse.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && !cancelled) openFromNotification(response);
      });
    }

    return () => {
      cancelled = true;
      subResponse?.remove();
    };
  }, [enabled, router]);
}
