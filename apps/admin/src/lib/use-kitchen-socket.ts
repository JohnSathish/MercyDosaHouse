'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_IO_CLIENT_OPTIONS } from '@mdh/utils';
import { io, Socket } from 'socket.io-client';
import { useToastStore } from '@/lib/toast-store';
import { playKitchenSound } from '@/lib/kitchen-sounds';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export function useKitchenSocket(muted: boolean) {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const socketRef = useRef<Socket | null>(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const socket = io(`${API_BASE}/orders`, SOCKET_IO_CLIENT_OPTIONS);
    socketRef.current = socket;

    socket.on('newOrder', (order: { orderNumber?: string; priority?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });
      toast(`New order received${order?.orderNumber ? `: #${order.orderNumber}` : ''}`);
      if (!mutedRef.current) playKitchenSound('new');
    });

    socket.on('orderStatusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, toast]);

  return socketRef;
}
