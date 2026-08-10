'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge, Card, CardContent } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import type { OrderDto } from '@mdh/types';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

const TRACK_STEPS = [
  { key: 'PENDING', label: 'Order Received', emoji: '📋' },
  { key: 'ACCEPTED', label: 'Accepted', emoji: '✅' },
  { key: 'PREPARING', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'READY', label: 'Ready', emoji: '🍽️' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', emoji: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '🎉' },
];

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
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!order) return;
    const socket = io(`${API_BASE}/orders`, {
      transports: ['websocket', 'polling'],
      timeout: 10_000,
    });
    socket.emit('subscribe', order.id);
    const onUpdate = (data: { status: string }) => setLiveStatus(data.status);
    socket.on('orderUpdate', onUpdate);
    socket.on('orderStatusChanged', onUpdate);
    return () => {
      socket.off('orderUpdate', onUpdate);
      socket.off('orderStatusChanged', onUpdate);
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
  const currentIdx = TRACK_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg pb-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-[#14532D]">Track Order</h1>
        {liveStatus && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        )}
      </div>
      <p className="text-muted-foreground mb-6 font-mono">{order.orderNumber}</p>

      <Card className="mb-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="font-semibold">Live Status</span>
            <Badge className="bg-[#14532D]">{ORDER_STATUS_LABELS[status] || status}</Badge>
          </div>

          <div className="relative pl-2">
            {TRACK_STEPS.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex gap-4 pb-6 last:pb-0 relative"
                >
                  {idx < TRACK_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-16px)] ${done ? 'bg-[#14532D]' : 'bg-gray-200'}`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      done ? 'bg-[#14532D] text-white' : 'bg-gray-100 text-gray-400'
                    } ${active ? 'ring-4 ring-[#14532D]/20' : ''}`}
                  >
                    {active && status !== 'DELIVERED' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className={`font-medium ${done ? 'text-[#14532D]' : 'text-gray-400'}`}>
                      {step.emoji} {step.label}
                    </p>
                    {active && status !== 'DELIVERED' && (
                      <p className="text-xs text-muted-foreground mt-0.5">In progress…</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm py-1.5 border-b border-dashed last:border-0"
            >
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold pt-3 mt-2 border-t">
            <span>Total</span>
            <span className="text-[#14532D]">{formatCurrency(order.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
