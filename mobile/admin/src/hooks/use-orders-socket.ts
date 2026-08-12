import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/auth-storage';
import {
  hasPlayedOrderAlert,
  loadNotificationPrefs,
  markOrderAlertPlayed,
  upsertOrderAlert,
} from '@/lib/notification-prefs';
import { playNewOrderRingtone } from '@/lib/new-order-ringtone';

export function useOrdersSocket(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      const token = await getAccessToken();
      if (cancelled) return;
      socket = io(`${SOCKET_URL}/orders`, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined,
      });
      const invalidate = () => {
        void qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
        void qc.invalidateQueries({ queryKey: ['dashboard-orders'] });
        void qc.invalidateQueries({ queryKey: ['admin-orders'] });
        void qc.invalidateQueries({ queryKey: ['orders'] });
        void qc.invalidateQueries({ queryKey: ['kds'] });
        void qc.invalidateQueries({ queryKey: ['admin-kds'] });
        void qc.invalidateQueries({ queryKey: ['kitchen'] });
      };

      socket.on('newOrder', (payload?: any) => {
        invalidate();
        void (async () => {
          const prefs = await loadNotificationPrefs();
          if (!prefs.enabled) return;
          const orderId = payload?.id ?? payload?.orderId;
          const orderNumber = payload?.orderNumber ?? orderId;
          if (!orderId) {
            await playNewOrderRingtone(prefs);
            return;
          }
          await upsertOrderAlert({
            orderId: String(orderId),
            orderNumber: String(orderNumber),
            customerName: payload?.customerName,
            orderType: payload?.orderType,
            amount:
              payload?.grandTotal != null ? `₹${Number(payload.grandTotal).toFixed(0)}` : undefined,
            title: '🔔 New Order Received!',
            body: `You have a new order #${orderNumber}. Tap to view the order.`,
            receivedAt: new Date().toISOString(),
            read: false,
          });
          const played = await hasPlayedOrderAlert(String(orderId));
          if (!played) {
            await markOrderAlertPlayed(String(orderId));
            await playNewOrderRingtone(prefs);
          }
        })();
      });
      socket.on('orderUpdate', invalidate);
      socket.on('orderStatusChanged', invalidate);
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [enabled, qc]);
}
