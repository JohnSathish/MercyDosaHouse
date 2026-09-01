import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { api } from '@/lib/api';

const TASK_NAME = 'mdh-active-delivery-location';
const ACTIVE_ORDER_KEY = 'mdh-active-delivery-order';
const PENDING_LOCATIONS_KEY = 'mdh-pending-delivery-locations';

type PendingLocation = {
  orderId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  recordedAt: string;
};

async function queueLocation(point: PendingLocation) {
  const raw = await SecureStore.getItemAsync(PENDING_LOCATIONS_KEY);
  const queue = raw ? (JSON.parse(raw) as PendingLocation[]) : [];
  queue.push(point);
  await SecureStore.setItemAsync(PENDING_LOCATIONS_KEY, JSON.stringify(queue.slice(-20)));
}

async function flushQueuedLocations() {
  const raw = await SecureStore.getItemAsync(PENDING_LOCATIONS_KEY);
  if (!raw) return;
  const queue = JSON.parse(raw) as PendingLocation[];
  let sent = 0;
  for (const point of queue) {
    try {
      await api.patch('/delivery/location', {
        orderId: point.orderId,
        lat: point.lat,
        lng: point.lng,
        accuracyMeters: point.accuracyMeters,
      });
      sent += 1;
    } catch {
      break;
    }
  }
  if (sent > 0) {
    const remaining = queue.slice(sent);
    if (remaining.length) {
      await SecureStore.setItemAsync(PENDING_LOCATIONS_KEY, JSON.stringify(remaining));
    } else {
      await SecureStore.deleteItemAsync(PENDING_LOCATIONS_KEY);
    }
  }
}

async function sendLocation(orderId: string, location: Location.LocationObject) {
  const point = {
    orderId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
    recordedAt: new Date().toISOString(),
  };
  try {
    await flushQueuedLocations();
    await api.patch('/delivery/location', point);
  } catch {
    await queueLocation(point);
    const current = await api
      .get<{ active: boolean }>(`/delivery/orders/${orderId}/live-location`)
      .catch(() => null);
    if (current && !current.active) {
      await AsyncStorage.removeItem(ACTIVE_ORDER_KEY);
    }
  }
}

async function stopLegacyBackgroundUpdates() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
  } catch {
    /* older builds registered this task */
  }
}

export function useDeliveryLocationSharing(
  orderId: string | undefined,
  active: boolean,
  options?: { intervalSeconds?: number; distanceMeters?: number },
) {
  useEffect(() => {
    let cancelled = false;
    let foregroundSubscription: Location.LocationSubscription | undefined;
    const start = async () => {
      if (!orderId || !active) return;
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== Location.PermissionStatus.GRANTED || cancelled) return;
      await stopLegacyBackgroundUpdates();
      await AsyncStorage.setItem(ACTIVE_ORDER_KEY, orderId);
      foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: Math.max(5, options?.intervalSeconds ?? 10) * 1000,
          distanceInterval: Math.max(10, options?.distanceMeters ?? 25),
        },
        (location) => {
          void sendLocation(orderId, location);
        },
      );
    };

    void start().catch(() => undefined);
    return () => {
      cancelled = true;
      foregroundSubscription?.remove();
    };
  }, [orderId, active, options?.intervalSeconds, options?.distanceMeters]);

  useEffect(() => {
    if (active || !orderId) return;
    void (async () => {
      await AsyncStorage.removeItem(ACTIVE_ORDER_KEY);
      await SecureStore.deleteItemAsync(PENDING_LOCATIONS_KEY);
      await stopLegacyBackgroundUpdates();
    })().catch(() => undefined);
  }, [active, orderId]);
}
