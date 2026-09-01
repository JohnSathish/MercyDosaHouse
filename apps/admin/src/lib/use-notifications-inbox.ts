'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@mdh/auth-client';
import type { InboxListDto, InboxNotificationDto } from '@mdh/types';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export const INBOX_KEY = ['admin-inbox'] as const;
export const UNREAD_KEY = ['admin-inbox-unread'] as const;

export function useInboxPreview(limit = 8) {
  return useQuery({
    queryKey: [...INBOX_KEY, 'preview', limit],
    queryFn: () => api.get<InboxListDto>(`/notifications/inbox?limit=${limit}&page=1`),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const socket = io(`${API_BASE}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: INBOX_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
      void queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
    };
    socket.on('notification', (row: InboxNotificationDto) => {
      invalidate();
      queryClient.setQueryData(UNREAD_KEY, (prev: { unreadCount: number } | undefined) => ({
        unreadCount: (prev?.unreadCount ?? 0) + (row.isRead ? 0 : 1),
      }));
    });
    socket.on('unreadCount', (payload: { unreadCount: number }) => {
      queryClient.setQueryData(UNREAD_KEY, payload);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);
}
