'use client';

import { useEffect } from 'react';
import type { PosApiClient } from '@mdh/pos-ui';

const OFFLINE_KEY = 'mdh-pos-offline-queue';

interface OfflineBill {
  localId: string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  items: { productId: string; variantId?: string; quantity: number }[];
}

export function getOfflineQueueCount(): number {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? '[]') as unknown[];
    return queue.length;
  } catch {
    return 0;
  }
}

export function usePosOfflineSync(api: PosApiClient, terminalId = 'pos-terminal-1') {
  useEffect(() => {
    function saveQueue(bills: OfflineBill[]) {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(bills));
    }

    function getQueue(): OfflineBill[] {
      try {
        return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? '[]') as OfflineBill[];
      } catch {
        return [];
      }
    }

    async function sync() {
      if (!navigator.onLine) return;
      const queue = getQueue();
      if (!queue.length) return;
      try {
        await api.post('/pos/offline/sync', { terminalId, bills: queue });
        saveQueue([]);
      } catch {
        /* retry later */
      }
    }

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, [api, terminalId]);
}

export function enqueueOfflineBill(bill: OfflineBill) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? '[]') as OfflineBill[];
    queue.push(bill);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}
