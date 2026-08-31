'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Calculator } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryZoneDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Button, Badge } from '@mdh/ui';

export default function DeliveryChargesPage() {
  const [distance, setDistance] = useState('3.5');
  const [result, setResult] = useState<{
    zone: string | null;
    charge: number | null;
    undeliverable?: boolean;
  } | null>(null);

  const { data: zones = [] } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => api.get<DeliveryZoneDto[]>('/delivery/zones'),
  });
  const { data: settings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get<{ freeDeliveryLimit?: number }>('/settings/business'),
  });
  const freeDeliveryLimit = settings?.freeDeliveryLimit ?? 299;

  async function calculate() {
    const res = await api.get<{
      zone: string | null;
      charge: number | null;
      undeliverable?: boolean;
    }>(`/delivery/zones/calculate?distanceKm=${distance}`);
    setResult(res);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-[#14532D]" />
          Delivery Charges
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatic charge calculation based on distance, zones, and order value
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Charge Calculator
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              placeholder="Distance in km"
            />
            <Button className="bg-[#14532D]" onClick={calculate}>
              Calculate
            </Button>
          </div>
          {result && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              {result.undeliverable ? (
                <p className="text-red-600 font-semibold">Not deliverable beyond 8 km</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Zone: {result.zone}</p>
                  <p className="text-2xl font-bold text-[#14532D]">
                    {formatCurrency(result.charge ?? 0)}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Charge Rules</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between py-2 border-b">
              <span>Distance-based zones</span>
              <Badge variant="outline" className="text-[10px]">
                Active
              </Badge>
            </li>
            <li className="flex justify-between py-2 border-b">
              <span>Free delivery above {formatCurrency(freeDeliveryLimit)}</span>
              <Badge variant="outline" className="text-[10px]">
                Active
              </Badge>
            </li>
            <li className="flex justify-between py-2 border-b">
              <span>Coupon discounts</span>
              <Badge variant="outline" className="text-[10px]">
                Active
              </Badge>
            </li>
            <li className="flex justify-between py-2 border-b">
              <span>Peak hour surcharge</span>
              <Badge variant="outline" className="text-[10px]">
                Coming soon
              </Badge>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <h3 className="font-semibold mb-3">Zone Pricing</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {zones.map((z) => (
            <div key={z.id} className="rounded-lg border p-4 text-center">
              <p className="font-semibold text-sm">{z.name}</p>
              <p className="text-xs text-muted-foreground">
                {Number(z.minKm)}–{Number(z.maxKm)} km
              </p>
              <p className="text-xl font-bold text-[#14532D] mt-1">
                {formatCurrency(Number(z.charge))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
