'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import type { ReportPeriod, SalesAnalyticsDto } from '@mdh/types';
import { ReportsFilterBar } from '@/components/reports/reports-filter-bar';
import { RevenueByHourChart, RevenueByDayChart } from '@/components/reports/reports-charts';

export default function SalesReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('week');

  const { data: sales, isLoading } = useQuery({
    queryKey: ['reports-sales', period],
    queryFn: () => api.get<SalesAnalyticsDto>(`/reports/sales?period=${period}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#14532D]" />
          Sales Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Revenue trends, forecasts, and hourly patterns
        </p>
      </div>
      <ReportsFilterBar period={period} onPeriodChange={setPeriod} />
      {sales && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4 bg-white dark:bg-gray-900">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Weekly Total</p>
            <p className="text-2xl font-bold text-[#14532D]">{formatCurrency(sales.weeklyTotal)}</p>
          </div>
          <div className="rounded-2xl border p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-gray-900">
            <p className="text-xs text-muted-foreground uppercase font-semibold">
              Revenue Forecast
            </p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(sales.forecast)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">+8% projected growth</p>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="h-80 rounded-2xl bg-muted animate-pulse" />
      ) : sales ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <RevenueByHourChart data={sales.byHour} />
          <RevenueByDayChart data={sales.byDay} />
        </div>
      ) : null}
    </div>
  );
}
