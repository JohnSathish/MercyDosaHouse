'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Map, MapPin, Navigation, Radio } from 'lucide-react';
import { Badge, Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type { DeliveryOrderDto } from '@mdh/types';
import { useDeliveryLiveUpdates } from '@/hooks/use-delivery-live-updates';

const DeliveryLiveMap = dynamic(
  () => import('@/components/delivery/delivery-live-map').then((module) => module.DeliveryLiveMap),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[360px] animate-pulse bg-muted" />,
  },
);

function isStale(lastLocationAt?: string | null) {
  return !lastLocationAt || Date.now() - new Date(lastLocationAt).getTime() > 120_000;
}

export default function DeliveryMapPage() {
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-map-active'],
    queryFn: () => api.get<DeliveryOrderDto[]>('/delivery/orders/list?status=on_the_way'),
    refetchInterval: 10_000,
  });
  const { connected, error } = useDeliveryLiveUpdates(orders.map((order) => order.id));
  const hasMapData = orders.some(
    (order) =>
      (order.deliveryLatitude != null && order.deliveryLongitude != null) ||
      (order.assignment?.latitude != null && order.assignment.longitude != null),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-[#14532D]" />
            Live Delivery Map
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real agent GPS positions and customer pins update over the authenticated live channel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mapType === 'standard' ? 'default' : 'outline'}
            onClick={() => setMapType('standard')}
          >
            Standard
          </Button>
          <Button
            size="sm"
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            onClick={() => setMapType('satellite')}
          >
            Satellite
          </Button>
        </div>
      </div>

      {hasMapData ? (
        <div className="h-[500px] overflow-hidden rounded-xl border shadow-sm">
          <DeliveryLiveMap
            orders={orders}
            mapType={mapType}
            onMapTypeChange={setMapType}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
          />
        </div>
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border bg-[#FFF8E8] p-6 text-center">
          <MapPin className="mb-3 h-10 w-10 text-[#14532D] opacity-60" />
          <p className="font-semibold">
            {isLoading ? 'Loading active deliveries…' : 'Waiting for delivery coordinates'}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Capture a customer pin and start delivery to show the live route here.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge className={connected ? 'bg-emerald-600' : 'bg-amber-500'}>
          {connected ? 'Live channel connected' : 'Reconnecting live channel'}
        </Badge>
        {error ? <span>{error}</span> : null}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-900">
        <h2 className="flex items-center gap-2 font-semibold">
          <Radio className="h-4 w-4 text-emerald-600" /> Active deliveries ({orders.length})
        </h2>
        <div className="mt-3 divide-y">
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading locations…</p>
          ) : null}
          {!isLoading && !orders.length ? (
            <p className="py-4 text-sm text-muted-foreground">No active deliveries.</p>
          ) : null}
          {orders.map((order) => {
            const hasAgent =
              order.assignment?.latitude != null && order.assignment.longitude != null;
            const hasCustomer = order.deliveryLatitude != null && order.deliveryLongitude != null;
            const stale = hasAgent && isStale(order.assignment?.lastLocationAt);
            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-mono font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} · {order.deliveryAddress}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasAgent
                      ? `Agent ${order.assignment?.executive?.name ?? ''}: ${order.assignment?.latitude}, ${order.assignment?.longitude}`
                      : 'Agent GPS unavailable'}
                    {' · '}
                    {hasCustomer
                      ? `Customer: ${order.deliveryLatitude}, ${order.deliveryLongitude}`
                      : 'Customer pin unavailable'}
                  </p>
                  {stale ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Last location is older than 2 minutes.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={hasAgent && !stale ? 'bg-emerald-600' : 'bg-amber-500'}>
                    {hasAgent && !stale ? 'Live GPS' : hasAgent ? 'Stale GPS' : 'Waiting'}
                  </Badge>
                  {hasCustomer ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLatitude},${order.deliveryLongitude}`,
                          '_blank',
                        )
                      }
                    >
                      <Navigation className="mr-1 h-3 w-3" /> Navigate
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant={selectedOrderId === order.id ? 'default' : 'outline'}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <MapPin className="mr-1 h-3 w-3" /> Show on map
                  </Button>
                  <a
                    href={`/orders?orderId=${order.id}`}
                    className="inline-flex items-center gap-1 text-xs text-[#14532D]"
                  >
                    Details <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
