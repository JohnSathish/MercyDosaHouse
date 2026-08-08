'use client';

import { useQuery } from '@tanstack/react-query';
import { Truck, ChefHat, Package, IndianRupee, Download } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { Button } from '@mdh/ui';
import { api } from '@/lib/api';
import type {
  DeliveryAnalyticsDto,
  KitchenAnalyticsDto,
  InventoryAnalyticsDto,
  ReportsDashboardDto,
} from '@mdh/types';

export default function DeliveryReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports-delivery'],
    queryFn: () => api.get<DeliveryAnalyticsDto>('/reports/delivery'),
  });

  if (!data) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Truck className="h-6 w-6 text-[#14532D]" /> Delivery Analytics
      </h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Delivered Today', value: data.delivered },
          { label: 'Pending', value: data.pending },
          { label: 'Avg Delivery Time', value: `${data.avgDeliveryMinutes} min` },
          { label: 'Top Executive', value: data.topExecutive },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border p-4 bg-white dark:bg-gray-900 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
            <p className="text-xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
