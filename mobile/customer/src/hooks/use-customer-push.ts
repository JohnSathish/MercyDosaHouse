import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { getAccessToken, storePushToken } from '@/lib/auth-storage';

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
    name: 'Mercy Dosa House — Order Updates',
    description: 'Live updates about your Mercy Dosa House orders.',
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
  const registeredAuthToken = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let subResponse: Notifications.Subscription | undefined;
    let subReceived: Notifications.Subscription | undefined;

    const openOrder = (data: OrderPushData) => {
      if (data?.orderNumber) {
        router.push(`/track/${encodeURIComponent(data.orderNumber)}`);
      }
    };

    const registerDevice = async () => {
      const token = await getAccessToken();
      if (!token || cancelled || registeredAuthToken.current === token) return;
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
        const tokenData =
          Platform.OS === 'android'
            ? await Notifications.getDevicePushTokenAsync()
            : projectId
              ? await Notifications.getExpoPushTokenAsync({ projectId })
              : await Notifications.getExpoPushTokenAsync();
        if (!tokenData.data || cancelled) return;
        await api.post('/notifications/device-token', {
          token: tokenData.data,
          platform: Platform.OS,
        });
        registeredAuthToken.current = token;
        await storePushToken(tokenData.data);
      } catch {
        /* emulator / permission */
      }
    };

    void registerDevice();
    const authPoll = setInterval(() => void registerDevice(), 5000);
    const tokenSubscription = Notifications.addPushTokenListener((tokenData) => {
      if (cancelled || Platform.OS !== 'android' || !tokenData.data) return;
      void getAccessToken()
        .then(async (accessToken) => {
          if (!accessToken) return;
          await api.post('/notifications/device-token', {
            token: tokenData.data,
            platform: Platform.OS,
          });
          registeredAuthToken.current = accessToken;
          await storePushToken(tokenData.data);
        })
        .catch(() => undefined);
    });

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
      clearInterval(authPoll);
      tokenSubscription.remove();
      subResponse?.remove();
      subReceived?.remove();
    };
  }, [router]);
}
