'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Save, Settings } from 'lucide-react';
import { Badge, Button, Input } from '@mdh/ui';
import { api } from '@/lib/api';
import type { DeliveryConfigDto } from '@mdh/types';

type DeliverySettings = DeliveryConfigDto & {
  areas?: string[];
  pincodes?: string[];
  deliveryCharge?: number | null;
  freeDeliveryThreshold?: number | null;
  minOrderAmount?: number | null;
  message?: string | null;
  expansionMessage?: string | null;
};

export default function DeliverySettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-config'],
    queryFn: () => api.get<DeliverySettings | null>('/marketing/delivery-config'),
  });
  const [form, setForm] = useState<Partial<DeliverySettings>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Partial<DeliverySettings>) =>
      api.patch<DeliverySettings>('/marketing/delivery-config', body),
    onSuccess: (next) => {
      queryClient.setQueryData(['delivery-config'], next);
      setForm(next);
    },
  });

  const set = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (isLoading || !data) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#14532D]" />
          Delivery & Maps
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Operational tracking settings are saved remotely and do not require an app release.
        </p>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Delivery system"
            value={form.status !== 'TEMPORARILY_UNAVAILABLE'}
            onChange={(v) => set('status', v ? 'LIMITED_AREA' : 'TEMPORARILY_UNAVAILABLE')}
          />
          <Toggle
            label="Live delivery tracking"
            value={form.trackingEnabled !== false}
            onChange={(v) => set('trackingEnabled', v)}
          />
          <Toggle
            label="Customer live tracking"
            value={form.customerTrackingEnabled !== false}
            onChange={(v) => set('customerTrackingEnabled', v)}
          />
          <Toggle
            label="ETA display"
            value={form.etaEnabled !== false}
            onChange={(v) => set('etaEnabled', v)}
          />
          <Toggle
            label="Near-customer alert"
            value={form.nearCustomerEnabled === true}
            onChange={(v) => set('nearCustomerEnabled', v)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Delivery radius (km)"
            value={form.deliveryRadiusKm ?? ''}
            onChange={(v) => set('deliveryRadiusKm', v === '' ? null : Number(v))}
          />
          <Field
            label="Location interval (seconds)"
            value={form.locationUpdateIntervalSeconds ?? 10}
            onChange={(v) => set('locationUpdateIntervalSeconds', Number(v))}
          />
          <Field
            label="Minimum movement (meters)"
            value={form.locationMinDistanceMeters ?? 25}
            onChange={(v) => set('locationMinDistanceMeters', Number(v))}
          />
          <Field
            label="History retention (days)"
            value={form.locationHistoryRetentionDays ?? 30}
            onChange={(v) => set('locationHistoryRetentionDays', Number(v))}
          />
          <Field
            label="Near-customer threshold (meters)"
            value={form.nearCustomerThresholdMeters ?? 500}
            onChange={(v) => set('nearCustomerThresholdMeters', Number(v))}
          />
          <Field
            label="Map provider"
            value={form.mapProvider ?? 'google'}
            onChange={(v) => set('mapProvider', v)}
          />
        </div>

        <div className="rounded-xl bg-[#FFF8E8] p-4 text-sm">
          <p className="font-semibold text-[#14532D] flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Delivery coverage
          </p>
          <p className="text-muted-foreground mt-1">
            Radius checks use the server-only restaurant coordinates. Area and pincode validation
            remains active.
          </p>
          <p className="mt-2">{form.areas?.join(', ') || 'No named areas configured'}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="bg-[#14532D] hover:bg-[#14532D]/90"
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
          >
            <Save className="h-4 w-4 mr-2" /> {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          {save.isSuccess ? <Badge className="bg-emerald-600">Saved</Badge> : null}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-lg border px-3 py-2 text-left text-sm ${value ? 'border-[#14532D] bg-[#14532D] text-white' : 'border-gray-200'}`}
      onClick={() => onChange(!value)}
    >
      {label}: {value ? 'ON' : 'OFF'}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm space-y-1">
      <span className="font-medium">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
