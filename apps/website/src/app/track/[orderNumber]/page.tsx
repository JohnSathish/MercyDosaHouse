'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge, Card, CardContent } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS, SOCKET_IO_CLIENT_OPTIONS } from '@mdh/utils';
import { api } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';
import { loadTrackToken, saveTrackToken } from '@/lib/last-order';
import type { LiveDeliveryLocationDto, OrderDto } from '@mdh/types';
import { io } from 'socket.io-client';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
const LiveDeliveryMap = dynamic(
  () => import('@/components/maps/live-delivery-map').then((module) => module.LiveDeliveryMap),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-[#FFF8E8]" />,
  },
);

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
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => {
      const token = loadTrackToken(orderNumber);
      const q = token ? `?trackToken=${encodeURIComponent(token)}` : '';
      return api.get<OrderDto>(`/orders/track/${orderNumber}${q}`);
    },
    enabled: !!orderNumber,
    retry: 1,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()));
  }, []);

  const { data: liveLocation } = useQuery({
    queryKey: ['delivery-live-location', order?.id],
    queryFn: () => api.get<LiveDeliveryLocationDto>(`/delivery/orders/${order!.id}/live-location`),
    enabled: hasSession && order?.status === 'OUT_FOR_DELIVERY',
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!order) return;
    let socket: ReturnType<typeof io> | undefined;
    let cancelled = false;
    const token = getAccessToken();
    if (!token) return;
    {
      socket = io(`${API_BASE}/orders`, {
        ...SOCKET_IO_CLIENT_OPTIONS,
        auth: { token },
      });
      socket.emit('subscribe', order.id);
      const onUpdate = (data: { status: string }) => setLiveStatus(data.status);
      socket.on('orderUpdate', onUpdate);
      socket.on('deliveryLocation', () => {
        void queryClient.invalidateQueries({ queryKey: ['delivery-live-location', order.id] });
      });
    }
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [order?.id, queryClient]);

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

  if (isError || (!order && !isLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg text-center">
        <p className="text-muted-foreground mb-4">Order not found or unavailable.</p>
        <a href="/" className="text-primary font-medium hover:underline">
          Back to Home
        </a>
      </div>
    );
  }

  if (order?.locked) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <h1 className="text-2xl font-bold text-[#14532D]">Verify to track</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          Order {order.orderNumber} is protected. Enter the phone number used at checkout, then
          request a code.
        </p>
        <Card>
          <CardContent className="p-6 space-y-3">
            <label className="text-sm font-medium">Phone</label>
            <input
              className="w-full h-11 rounded-xl border px-3"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              inputMode="tel"
            />
            <button
              type="button"
              className="text-sm font-semibold text-[#14532D]"
              disabled={unlocking}
              onClick={async () => {
                setUnlockError(null);
                setUnlocking(true);
                try {
                  const res = await api.post<{
                    channel: string;
                    hint?: string;
                    destination?: string;
                  }>(`/orders/track/${orderNumber}/otp`, { phone });
                  setOtpHint(
                    res.hint ||
                      (res.channel === 'EMAIL'
                        ? `Code sent to ${res.destination}`
                        : res.channel === 'SMS'
                          ? `Code sent to ${res.destination}`
                          : 'Enter the 4-digit delivery code from your confirmation.'),
                  );
                } catch (err) {
                  setUnlockError(err instanceof Error ? err.message : 'Could not send code.');
                } finally {
                  setUnlocking(false);
                }
              }}
            >
              Send code
            </button>
            <label className="text-sm font-medium">Verification code</label>
            <input
              className="w-full h-11 rounded-xl border px-3"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="OTP"
              inputMode="numeric"
            />
            {otpHint ? <p className="text-sm text-amber-700">{otpHint}</p> : null}
            {unlockError ? <p className="text-sm text-red-600">{unlockError}</p> : null}
            <button
              type="button"
              className="w-full h-11 rounded-xl bg-[#14532D] text-white font-semibold"
              disabled={unlocking}
              onClick={async () => {
                setUnlockError(null);
                setUnlocking(true);
                try {
                  const unlocked = await api.post<OrderDto>(`/orders/track/${orderNumber}/verify`, {
                    phone,
                    otp,
                  });
                  if (unlocked.trackToken) saveTrackToken(orderNumber, unlocked.trackToken);
                  await refetch();
                } catch (err) {
                  setUnlockError(err instanceof Error ? err.message : 'Invalid code.');
                } finally {
                  setUnlocking(false);
                }
              }}
            >
              Unlock order
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) return null;

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

      {liveLocation?.active ? <LiveDeliveryPanel data={liveLocation} /> : null}

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

function LiveDeliveryPanel({ data }: { data: LiveDeliveryLocationDto }) {
  const hasMapPoints =
    (data.agent?.latitude != null && data.agent.longitude != null) ||
    (data.customer.latitude != null && data.customer.longitude != null);
  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#14532D]">🛵 Your Order Is On The Way</h2>
            <Badge className="bg-emerald-600">LIVE</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your delivery partner is heading to you.
          </p>
          <p className="font-semibold mt-3">
            {data.distanceKm != null ? `${data.distanceKm.toFixed(1)} km away` : 'Route updating'}
            {data.etaMinutes != null ? ` • ETA ${data.etaMinutes} min` : ''}
          </p>
        </div>
        {hasMapPoints ? (
          <LiveDeliveryMap data={data} />
        ) : (
          <div className="mx-5 mb-5 rounded-xl bg-[#FFF8E8] p-4 text-sm text-muted-foreground">
            Live GPS is active. The map provider is being configured for this restaurant.
          </div>
        )}
        <div className="px-5 pb-5 text-sm">
          <p className="font-medium">Delivery Partner {data.agent?.name ?? 'on the way'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated:{' '}
            {data.lastUpdatedAt ? new Date(data.lastUpdatedAt).toLocaleString() : 'Waiting for GPS'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
