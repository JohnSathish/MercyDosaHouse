'use client';

import { formatCurrency } from '@mdh/utils';
import type { PosLiveAnalyticsDto } from '@mdh/types';

export function PosAnalyticsStrip({ analytics }: { analytics: PosLiveAnalyticsDto | null }) {
  if (!analytics) return null;
  const items = [
    { label: 'Today Revenue', value: formatCurrency(analytics.revenueToday) },
    { label: 'Orders', value: String(analytics.ordersToday) },
    { label: 'Avg Bill', value: formatCurrency(analytics.avgBillValue) },
    { label: 'Customers', value: String(analytics.customersToday) },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase text-gray-400 font-semibold">{item.label}</p>
          <p className="text-lg font-bold text-emerald-400">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
