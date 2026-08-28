'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Button, Input } from '@mdh/ui';
import { api } from '@/lib/api';
import type { DeliveryZoneDto } from '@mdh/types';
import { DeliveryZonesTable } from '@/components/delivery/delivery-zones-table';

export default function DeliveryZonesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    minKm: '0',
    maxKm: '8',
    charge: '30',
    minimumOrderAmount: '',
    estimatedDeliveryMinutes: '30',
    polygon: '',
  });
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const raw = await api.get<
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
  const create = useMutation({
    mutationFn: () =>
      api.post('/delivery/zones', {
        ...form,
        minKm: Number(form.minKm),
        maxKm: Number(form.maxKm),
        charge: Number(form.charge),
        minimumOrderAmount: form.minimumOrderAmount ? Number(form.minimumOrderAmount) : undefined,
        estimatedDeliveryMinutes: form.estimatedDeliveryMinutes
          ? Number(form.estimatedDeliveryMinutes)
          : undefined,
        polygon: form.polygon ? JSON.parse(form.polygon) : undefined,
      }),
    onSuccess: () => {
      setForm({
        name: '',
        slug: '',
        minKm: '0',
        maxKm: '8',
        charge: '30',
        minimumOrderAmount: '',
        estimatedDeliveryMinutes: '30',
        polygon: '',
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
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
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-3">
        <h2 className="font-semibold">Add delivery zone</h2>
        <p className="text-xs text-muted-foreground">
          Polygon JSON is ready for a map drawing tool: [{`{"latitude": 25.5, "longitude": 90.2}`}].
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              'name',
              'slug',
              'minKm',
              'maxKm',
              'charge',
              'minimumOrderAmount',
              'estimatedDeliveryMinutes',
            ] as const
          ).map((key) => (
            <Input
              key={key}
              placeholder={key}
              value={form[key]}
              onChange={(event) =>
                setForm((current) => ({ ...current, [key]: event.target.value }))
              }
            />
          ))}
          <Input
            className="lg:col-span-2"
            placeholder="Polygon JSON (optional)"
            value={form.polygon}
            onChange={(event) =>
              setForm((current) => ({ ...current, polygon: event.target.value }))
            }
          />
        </div>
        <Button
          className="bg-[#14532D] hover:bg-[#14532D]/90"
          disabled={create.isPending || !form.name || !form.slug}
          onClick={() => create.mutate()}
        >
          <MapPin className="h-4 w-4 mr-2" /> {create.isPending ? 'Saving…' : 'Save zone'}
        </Button>
        {create.isError ? (
          <p className="text-sm text-red-600">{(create.error as Error).message}</p>
        ) : null}
      </div>
      <DeliveryZonesTable zones={zones} loading={isLoading} />
    </div>
  );
}
