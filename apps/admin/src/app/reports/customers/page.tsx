'use client';

import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { CustomerAnalyticsDto } from '@mdh/types';

export default function CustomerReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-customers'],
    queryFn: () => api.get<CustomerAnalyticsDto>('/reports/customers'),
  });

  if (isLoading || !data) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  const cards = [
    { label: 'Total Customers', value: data.total },
    { label: 'New Today', value: data.newToday },
    { label: 'VIP Customers', value: data.vip },
    { label: 'Repeat Customers', value: data.repeat },
    { label: 'Inactive', value: data.inactive },
    { label: 'Avg Spend', value: formatCurrency(data.avgSpend) },
    { label: 'Lifetime Value', value: formatCurrency(data.lifetimeValue) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-[#14532D]" />
          Customer Analytics
        </h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
