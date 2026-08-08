'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import type { ReportPeriod, OrderAnalyticsDto } from '@mdh/types';
import { ReportsFilterBar } from '@/components/reports/reports-filter-bar';
import { OrderStatusDonut } from '@/components/reports/reports-charts';

export default function OrderReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('week');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-orders', period],
    queryFn: () => api.get<OrderAnalyticsDto>(`/reports/orders?period=${period}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-[#14532D]" />
          Order Analytics
        </h1>
      </div>
      <ReportsFilterBar period={period} onPeriodChange={setPeriod} />
      {data && (
        <div className="grid md:grid-cols-3 gap-3">
          <StatCard label="Delivery" value={data.delivery} />
          <StatCard label="Pickup" value={data.pickup} />
          <StatCard label="Refunded/Cancelled" value={data.refunded} />
        </div>
      )}
      {isLoading ? (
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      ) : data ? (
        <OrderStatusDonut data={data.byStatus} />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
