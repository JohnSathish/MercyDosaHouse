'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radio, MapPin, Clock } from 'lucide-react';
import { Badge } from '@mdh/ui';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto, DeliveryOrderDto } from '@mdh/types';
import { DeliveryStatusBadge } from '@/components/delivery/delivery-status-badge';
import { ExecutiveStatusBadge } from '@/components/delivery/delivery-status-badge';
import { useDeliveryLiveUpdates } from '@/hooks/use-delivery-live-updates';

const DeliveryLiveMap = dynamic(
  () => import('@/components/delivery/delivery-live-map').then((module) => module.DeliveryLiveMap),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[320px] animate-pulse bg-muted" />,
  },
);

export default function LiveTrackingPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
    refetchInterval: 10_000,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['delivery-active'],
    queryFn: () => api.get<DeliveryOrderDto[]>('/delivery/orders/list?status=on_the_way'),
    refetchInterval: 10_000,
  });
  const { connected, error } = useDeliveryLiveUpdates(activeOrders.map((order) => order.id));
  const hasMapData = activeOrders.some(
    (order) =>
      (order.deliveryLatitude != null && order.deliveryLongitude != null) ||
      (order.assignment?.latitude != null && order.assignment.longitude != null),
  );

  if (isLoading || !dashboard) {
    return <div className="h-96 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-[#14532D]" />
          Live Tracking
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time rider locations and active deliveries
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Live Map</h3>
            <Badge className={connected ? 'bg-emerald-600' : 'bg-amber-500'}>
              {connected ? 'Live' : 'Reconnecting'}
            </Badge>
          </div>
          <div className="relative h-80 overflow-hidden rounded-xl border">
            {hasMapData ? (
              <DeliveryLiveMap
                orders={activeOrders}
                mapType={mapType}
                onMapTypeChange={setMapType}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-[#FFF8E8] p-6 text-center">
                <MapPin className="mb-2 h-9 w-9 text-[#14532D] opacity-60" />
                <p className="font-semibold">No delivery coordinates available</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start an assigned delivery to receive agent GPS.
                </p>
              </div>
            )}
          </div>
          {error ? <p className="mt-2 text-xs text-amber-700">{error}</p> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-semibold mb-3">Online Riders ({dashboard.stats.onlineRiders})</h3>
            {dashboard.executives.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
              >
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.vehicleNumber}</p>
                </div>
                <ExecutiveStatusBadge status={e.status} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Active Deliveries
            </h3>
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deliveries</p>
            ) : (
              activeOrders.map((o) => (
                <div key={o.id} className="py-2 border-b last:border-0 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold">{o.orderNumber}</span>
                    <DeliveryStatusBadge status={o.assignment?.status ?? 'WAITING'} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{o.deliveryAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.assignment?.executive?.name ?? 'Unassigned'} ·{' '}
                    {o.assignment?.latitude != null && o.assignment?.longitude != null
                      ? 'GPS active'
                      : 'Waiting for GPS'}
                  </p>
                  {o.assignment?.etaMinutes && (
                    <p className="text-xs font-semibold text-purple-600 mt-0.5">
                      ETA: {o.assignment.etaMinutes} min
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
