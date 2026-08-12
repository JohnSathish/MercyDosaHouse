import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/auth-storage';

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
      socket.on('newOrder', invalidate);
      socket.on('orderUpdate', invalidate);
      socket.on('orderStatusChanged', invalidate);
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [enabled, qc]);
}
