'use client';

import type { DeliveryZoneDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';
import { Badge } from '@mdh/ui';
import { MapPin } from 'lucide-react';

interface DeliveryZonesTableProps {
  zones: DeliveryZoneDto[];
  loading?: boolean;
}

export function DeliveryZonesTable({ zones, loading }: DeliveryZonesTableProps) {
  if (loading) {
    return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Zone
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Distance Range
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Charge
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id} className="border-b hover:bg-muted/20">
              <td className="px-4 py-3 font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#14532D]" />
                {z.name}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {z.minKm} – {z.maxKm} km
              </td>
              <td className="px-4 py-3 font-bold text-[#14532D]">{formatCurrency(z.charge)}</td>
              <td className="px-4 py-3">
                <Badge variant={z.isActive ? 'default' : 'outline'} className="text-[10px]">
                  {z.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
            </tr>
          ))}
          <tr className="bg-red-50/50 dark:bg-red-950/20">
            <td className="px-4 py-3 font-semibold text-red-600">Beyond 8 km</td>
            <td className="px-4 py-3 text-muted-foreground">&gt; 8 km</td>
            <td className="px-4 py-3 font-bold text-red-600">Not Deliverable</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="text-[10px] text-red-600">
                Blocked
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
