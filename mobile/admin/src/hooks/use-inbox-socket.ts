import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/auth-storage';

export function useInboxSocket(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | null = null;
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (cancelled) return;
      socket = io(`${SOCKET_URL}/notifications`, {
        transports: ['websocket', 'polling'],
        auth: token ? { token } : undefined,
      });
      const invalidate = () => {
        void qc.invalidateQueries({ queryKey: ['admin-inbox'] });
        void qc.invalidateQueries({ queryKey: ['admin-inbox-unread'] });
      };
      socket.on('notification', invalidate);
      socket.on('unreadCount', invalidate);
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [enabled, qc]);
}
