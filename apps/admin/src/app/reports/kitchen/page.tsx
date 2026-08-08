'use client';

import { useQuery } from '@tanstack/react-query';
import { ChefHat } from 'lucide-react';
import { api } from '@/lib/api';
import type { KitchenAnalyticsDto } from '@mdh/types';

export default function KitchenReportsPage() {
  const { data } = useQuery({
    queryKey: ['reports-kitchen'],
    queryFn: () => api.get<KitchenAnalyticsDto>('/reports/kitchen'),
  });

  if (!data) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ChefHat className="h-6 w-6 text-[#14532D]" /> Kitchen Analytics
      </h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Avg Prep Time', value: `${data.avgPrepMinutes} min` },
          { label: 'Orders Today', value: data.ordersToday },
          { label: 'Busiest Hour', value: `${data.busiestHour}:00` },
          { label: 'Efficiency', value: `${data.efficiency}%` },
          { label: 'Delayed', value: data.delayed },
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
