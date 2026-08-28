'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Map, MapPin, Navigation, Radio } from 'lucide-react';
import { Button, Badge } from '@mdh/ui';
import { api } from '@/lib/api';
import type { DeliveryOrderDto } from '@mdh/types';

export default function DeliveryMapPage() {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['delivery-map-active'],
    queryFn: () => api.get<DeliveryOrderDto[]>('/delivery/orders/list?status=on_the_way'),
    refetchInterval: 10_000,
  });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapped = orders.find(
    (order) =>
      order.deliveryLatitude != null &&
      order.deliveryLongitude != null &&
      order.assignment?.latitude != null &&
      order.assignment.longitude != null,
  );
  const origin = mapped ? `${mapped.assignment!.latitude},${mapped.assignment!.longitude}` : null;
  const destination = mapped ? `${mapped.deliveryLatitude},${mapped.deliveryLongitude}` : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-[#14532D]" />
            Live Delivery Map
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Active delivery locations update every few seconds over the authenticated delivery
            channel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mapType === 'roadmap' ? 'default' : 'outline'}
            onClick={() => setMapType('roadmap')}
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

      {apiKey && origin && destination ? (
        <div className="rounded-xl border overflow-hidden shadow-sm h-[500px]">
          <iframe
            title="Active delivery route"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}&mode=driving&maptype=${mapType}`}
          />
        </div>
      ) : (
        <div className="h-[300px] rounded-xl border bg-[#FFF8E8] flex flex-col items-center justify-center text-center p-6">
          <MapPin className="h-10 w-10 text-[#14532D] opacity-60 mb-3" />
          <p className="font-semibold">Waiting for a routable active delivery</p>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Configure the restricted map key and capture customer GPS coordinates to render the live
            route.
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h2 className="font-semibold flex items-center gap-2">
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
              order.assignment?.latitude != null && order.assignment?.longitude != null;
            const hasCustomer = order.deliveryLatitude != null && order.deliveryLongitude != null;
            return (
              <div
                key={order.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-mono font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} · {order.deliveryAddress}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasAgent
                      ? `Agent ${order.assignment?.executive?.name ?? ''}: ${order.assignment?.latitude}, ${order.assignment?.longitude}`
                      : 'Agent GPS unavailable'}
                    {' · '}
                    {hasCustomer
                      ? `Customer: ${order.deliveryLatitude}, ${order.deliveryLongitude}`
                      : 'Customer pin unavailable'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600">{hasAgent ? 'Live GPS' : 'Waiting'}</Badge>
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
                      <Navigation className="h-3 w-3 mr-1" /> Navigate
                    </Button>
                  ) : null}
                  <a
                    href={`/orders?orderId=${order.id}`}
                    className="text-xs text-[#14532D] inline-flex items-center gap-1"
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
