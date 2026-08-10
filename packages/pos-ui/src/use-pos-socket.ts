'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function usePosSocket(billId?: string | null, onUpdate?: (data: unknown) => void) {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';
    if (!socket) {
      socket = io(`${url}/pos`, { transports: ['websocket'] });
    }

    const handler = (data: unknown) => onUpdate?.(data);
    if (billId) {
      socket.emit('subscribeBill', billId);
      socket.on('billUpdate', handler);
    }

    return () => {
      if (billId) socket?.off('billUpdate', handler);
    };
  }, [billId, onUpdate]);
}

export function getPosSocket() {
  const url = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';
  if (!socket) socket = io(`${url}/pos`, { transports: ['websocket'] });
  return socket;
}
