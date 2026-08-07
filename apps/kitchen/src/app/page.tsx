'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Badge } from '@mdh/ui';
import { ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { io } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

interface KitchenOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  items: { productName: string; quantity: number; variantName?: string | null }[];
  createdAt: string;
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: orders } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => api.get<KitchenOrder[]>('/kitchen/orders'),
  });

  useEffect(() => {
    const socket = io(`${API_BASE}/orders`);
    socket.on('newOrder', () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => undefined);
      } catch {
        /* ignore */
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const accept = useMutation({
    mutationFn: (id: string) => api.patch(`/kitchen/orders/${id}/accept`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.patch(`/kitchen/orders/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  const preparing = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/kitchen/orders/${id}/preparing`, { trackingStatus: 'COOKING' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  const ready = useMutation({
    mutationFn: (id: string) => api.patch(`/kitchen/orders/${id}/ready`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Incoming Orders</h2>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders?.map((order) => (
          <div key={order.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-2xl font-bold text-yellow-400">{order.orderNumber}</p>
                <p className="text-gray-400">{order.customerName}</p>
              </div>
              <Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <ul className="space-y-2 mb-6">
              {order.items.map((item, i) => (
                <li key={i} className="text-lg">
                  {item.quantity}x {item.productName}
                  {item.variantName && ` (${item.variantName})`}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {order.status === 'PENDING' && (
                <>
                  <Button
                    onClick={() => accept.mutate(order.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accept
                  </Button>
                  <Button onClick={() => reject.mutate(order.id)} variant="destructive">
                    Reject
                  </Button>
                </>
              )}
              {order.status === 'ACCEPTED' && (
                <Button
                  onClick={() => preparing.mutate(order.id)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Start Cooking
                </Button>
              )}
              {order.status === 'PREPARING' && (
                <Button
                  onClick={() => ready.mutate(order.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Mark Ready
                </Button>
              )}
            </div>
          </div>
        ))}
        {orders?.length === 0 && (
          <p className="text-gray-500 text-xl col-span-full text-center py-16">No pending orders</p>
        )}
      </div>
    </div>
  );
}
