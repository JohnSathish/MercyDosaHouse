'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Badge } from '@mdh/ui';
import { SOCKET_IO_CLIENT_OPTIONS, ORDER_STATUS_LABELS } from '@mdh/utils';
import { OrderStatus, type KitchenDashboardDto, type KitchenOrderDto } from '@mdh/types';
import { api } from '@/lib/api';
import { io } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [muted, setMuted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['kds-dashboard'],
    queryFn: () => api.get<KitchenDashboardDto>('/kitchen/dashboard?status=all'),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const socket = io(`${API_BASE}/orders`, SOCKET_IO_CLIENT_OPTIONS);
    socket.on('newOrder', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });
      if (!muted) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.3;
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, 150);
        } catch {
          /* ignore */
        }
      }
    });
    socket.on('orderStatusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [queryClient, muted]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kds-dashboard'] });

  const action = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const map: Record<string, () => Promise<unknown>> = {
        accept: () => api.patch(`/kitchen/orders/${id}/accept`),
        reject: () => api.patch(`/kitchen/orders/${id}/reject`, { reason: 'Rejected' }),
        preparing: () =>
          api.patch(`/kitchen/orders/${id}/preparing`, { trackingStatus: 'COOKING' }),
        ready: () => api.patch(`/kitchen/orders/${id}/ready`),
        complete: () => api.patch(`/kitchen/orders/${id}/complete`),
      };
      return map[type]?.();
    },
    onSuccess: invalidate,
  });

  const orders = data?.orders ?? [];

  const handleAction = useCallback(
    (type: string, id: string) => action.mutate({ type, id }),
    [action],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Kitchen Display</h2>
        <Button variant="outline" size="sm" onClick={() => setMuted((m) => !m)}>
          {muted ? 'Unmute' : 'Mute'}
        </Button>
      </div>

      {data?.stats && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(data.stats).map(([key, val]) => (
            <div key={key} className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{val}</p>
              <p className="text-xs text-gray-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading orders…</p>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {orders.map((order: KitchenOrderDto) => (
            <div key={order.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{order.orderNumber}</p>
                  {order.tokenNumber && (
                    <p className="text-sm text-amber-400">Token #{order.tokenNumber}</p>
                  )}
                  <p className="text-gray-400">{order.customerName}</p>
                </div>
                <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
              </div>
              <ul className="space-y-2 mb-6">
                {order.items.map((item) => (
                  <li key={item.id} className="text-lg">
                    {item.quantity}× {item.productName}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {order.status === OrderStatus.PENDING && (
                  <>
                    <Button
                      onClick={() => handleAction('accept', order.id)}
                      className="min-h-14 bg-green-600"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleAction('reject', order.id)}
                      variant="destructive"
                      className="min-h-14"
                    >
                      Reject
                    </Button>
                  </>
                )}
                {order.status === OrderStatus.ACCEPTED && (
                  <Button
                    onClick={() => handleAction('preparing', order.id)}
                    className="min-h-14 bg-orange-600"
                  >
                    Start Cooking
                  </Button>
                )}
                {order.status === OrderStatus.PREPARING && (
                  <Button
                    onClick={() => handleAction('ready', order.id)}
                    className="min-h-14 bg-blue-600"
                  >
                    Mark Ready
                  </Button>
                )}
                {order.status === OrderStatus.READY && !order.kitchenCompletedAt && (
                  <Button onClick={() => handleAction('complete', order.id)} className="min-h-14">
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-gray-500 text-xl col-span-full text-center py-16">
              No active orders
            </p>
          )}
        </div>
      )}
    </div>
  );
}
