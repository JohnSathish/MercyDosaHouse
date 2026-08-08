'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryZoneDto } from '@mdh/types';
import { DeliveryZonesTable } from '@/components/delivery/delivery-zones-table';

export default function DeliveryZonesPage() {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const raw =
        await api.get<
          Array<
            Omit<DeliveryZoneDto, 'minKm' | 'maxKm' | 'charge'> & {
              minKm: number | string;
              maxKm: number | string;
              charge: number | string;
            }
          >
        >('/delivery/zones');
      return raw.map((z) => ({
        ...z,
        minKm: Number(z.minKm),
        maxKm: Number(z.maxKm),
        charge: Number(z.charge),
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-[#14532D]" />
          Delivery Zones
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure distance-based delivery zones and charges
        </p>
      </div>
      <DeliveryZonesTable zones={zones} loading={isLoading} />
    </div>
  );
}
