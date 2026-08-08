'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, CardContent } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import type { OrderDto } from '@mdh/types';
import { io } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export default function TrackOrderPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get<OrderDto>(`/orders/track/${orderNumber}`),
    enabled: !!orderNumber,
    retry: 1,
  });

  useEffect(() => {
    if (!order) return;
    const socket = io(`${API_BASE}/orders`, {
      transports: ['websocket', 'polling'],
      timeout: 10_000,
    });
    socket.emit('subscribe', order.id);
    const onUpdate = (data: { status: string }) => {
      setLiveStatus(data.status);
    };
    socket.on('orderUpdate', onUpdate);
    return () => {
      socket.off('orderUpdate', onUpdate);
      socket.disconnect();
    };
  }, [order?.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg text-center">
        <p className="text-muted-foreground mb-4">Order not found or unavailable.</p>
        <a href="/" className="text-primary font-medium hover:underline">
          Back to Home
        </a>
      </div>
    );
  }

  const status = liveStatus || order.status;

  const steps = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIdx = steps.indexOf(status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold text-primary mb-2">Track Order</h1>
      <p className="text-muted-foreground mb-6">{order.orderNumber}</p>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Status</span>
            <Badge>{ORDER_STATUS_LABELS[status] || status}</Badge>
          </div>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx <= currentIdx ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={idx <= currentIdx ? 'font-medium' : 'text-muted-foreground'}>
                  {ORDER_STATUS_LABELS[step]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span>
                {item.productName} x{item.quantity}
              </span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-2 border-t mt-2">
            <span>Total</span>
            <span>{formatCurrency(order.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
