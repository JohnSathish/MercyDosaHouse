import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { getAccessToken, storePushToken } from '@/lib/auth-storage';

type OrderPushData = {
  type?: string;
  orderId?: string;
  orderNumber?: string;
  screen?: string;
};

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
  const registrationInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let Notifications: typeof import('expo-notifications');
    try {
      // Native module can be missing on a sideloaded/incomplete APK.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch {
      return;
    }

    let subResponse: { remove: () => void } | undefined;
    let subReceived: { remove: () => void } | undefined;
    let tokenSubscription: { remove: () => void } | undefined;

    const openOrder = async (data: OrderPushData) => {
      if (!data?.orderNumber) return;
      if (data.orderId) {
        const accessToken = await getAccessToken();
        if (accessToken) {
          await api
            .post('/notifications/read-by-order', { orderId: data.orderId })
            .catch(() => undefined);
        }
      }
      router.push(`/track/${encodeURIComponent(data.orderNumber)}`);
    };

    const ensureCustomerChannel = async () => {
      if (Platform.OS !== 'android') return;
      await Notifications.setNotificationChannelAsync('order_updates', {
        name: 'Mercy Dosa House — Order Updates',
        description: 'Live updates about your Mercy Dosa House orders.',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        sound: 'default',
      });
    };

    const registerDevice = async () => {
      const token = await getAccessToken();
      if (
        !token ||
        cancelled ||
        registeredAuthToken.current === token ||
        registrationInFlight.current
      )
        return;
      registrationInFlight.current = true;
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
        const expoToken = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        let nativeData: string | undefined;
        try {
          if (Platform.OS === 'android') {
            nativeData = (await Notifications.getDevicePushTokenAsync()).data;
          }
        } catch {
          /* google-services.json missing — Expo token still delivers */
        }
        const tokens = [...new Set([expoToken.data, nativeData].filter(Boolean))];
        for (const pushToken of tokens) {
          await api.post('/notifications/device-token', {
            token: pushToken,
            platform: Platform.OS,
          });
        }
        registeredAuthToken.current = token;
        await storePushToken(expoToken.data);
      } catch {
        /* emulator / permission / missing native module */
      } finally {
        registrationInFlight.current = false;
      }
    };

    void registerDevice();
    const authPoll = setInterval(() => void registerDevice(), 5000);
    tokenSubscription = Notifications.addPushTokenListener((tokenData) => {
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
      void openOrder((response.notification.request.content.data ?? {}) as OrderPushData);
    });
    subReceived = Notifications.addNotificationReceivedListener(() => undefined);

    if (!handledLaunch.current) {
      handledLaunch.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response && !cancelled) {
          void openOrder((response.notification.request.content.data ?? {}) as OrderPushData);
        }
      });
    }

    return () => {
      cancelled = true;
      clearInterval(authPoll);
      tokenSubscription?.remove();
      subResponse?.remove();
      subReceived?.remove();
    };
  }, [router]);
}
