'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_IO_CLIENT_OPTIONS } from '@mdh/utils';
import { io, Socket } from 'socket.io-client';
import type { ActivityLogDto } from '@mdh/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export function useActivitySocket(onNewActivity?: (log: ActivityLogDto) => void) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [liveItems, setLiveItems] = useState<ActivityLogDto[]>([]);
  const callbackRef = useRef(onNewActivity);

  useEffect(() => {
    callbackRef.current = onNewActivity;
  }, [onNewActivity]);

  const prependActivity = useCallback(
    (log: ActivityLogDto) => {
      setLiveItems((prev) => [log, ...prev].slice(0, 50));
      callbackRef.current?.(log);
      queryClient.invalidateQueries({ queryKey: ['activity-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
    [queryClient],
  );

  useEffect(() => {
    const socket = io(`${API_BASE}/activity`, SOCKET_IO_CLIENT_OPTIONS);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('newActivity', (activity: ActivityLogDto) => prependActivity(activity));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [prependActivity]);

  return { connected, liveItems, setLiveItems };
}
