'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Star } from 'lucide-react';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto } from '@mdh/types';
import { formatCurrency } from '@mdh/utils';

export default function DeliveryAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
  });

  if (isLoading || !data) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  const peakHours = (data.performance?.hourly ?? [])
    .filter((point) => point.deliveries > 0)
    .map((point) => ({
      hour: `${point.hour.toString().padStart(2, '0')}:00`,
      orders: point.deliveries,
    }));
  const maxPeak = Math.max(...peakHours.map((p) => p.orders));

  const successRate =
    data.stats.deliveredToday + data.stats.cancelledToday > 0
      ? Math.round(
          (data.stats.deliveredToday / (data.stats.deliveredToday + data.stats.cancelledToday)) *
            100,
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#14532D]" />
          Delivery Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Performance insights, peak hours, and executive rankings
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Success Rate',
            value: successRate == null ? '—' : `${successRate}%`,
            icon: TrendingUp,
            color: 'text-emerald-600',
          },
          {
            label: 'Avg Delivery Time',
            value:
              data.stats.avgDeliveryMinutes == null ? '—' : `${data.stats.avgDeliveryMinutes} min`,
            icon: Clock,
            color: 'text-blue-600',
          },
          {
            label: 'Delivered Today',
            value: data.stats.deliveredToday,
            icon: BarChart3,
            color: 'text-purple-600',
          },
          {
            label: 'Revenue',
            value: formatCurrency(data.stats.deliveryRevenue),
            icon: Star,
            color: 'text-amber-600',
          },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-semibold">
              <Icon className={`h-4 w-4 ${color}`} />
              {label}
            </div>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Peak Delivery Hours</h3>
          <div className="flex min-h-40 items-end gap-3">
            {peakHours.length ? (
              peakHours.map((p) => (
                <div key={p.hour} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold">{p.orders}</span>
                  <div
                    className="w-full rounded-t bg-[#14532D]/80"
                    style={{ height: `${(p.orders / maxPeak) * 100}%`, minHeight: 4 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{p.hour}</span>
                </div>
              ))
            ) : (
              <p className="w-full self-center text-center text-sm text-muted-foreground">
                No completed delivery trend data.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Executive Ranking</h3>
          {data.executives.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.totalDeliveries} deliveries</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-amber-600">★ {e.rating.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(e.todayEarnings)} today
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
