'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { ReportsKpiDto, ReportsLiveDto } from '@mdh/types';
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Wallet,
  UtensilsCrossed,
  XCircle,
  ChefHat,
  CheckCircle2,
  Star,
  Package,
} from 'lucide-react';
import { cn } from '@mdh/ui';

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span className={cn('text-[10px] font-bold', up ? 'text-emerald-400' : 'text-red-400')}>
      {up ? '▲' : '▼'} {Math.abs(value)}%
    </span>
  );
}

const KPI_CARDS = [
  {
    key: 'revenue',
    label: "Today's Revenue",
    icon: IndianRupee,
    color: 'from-[#14532D] to-emerald-700',
    format: 'currency',
    trendKey: 'revenueTrend',
  },
  {
    key: 'orders',
    label: "Today's Orders",
    icon: ShoppingBag,
    color: 'from-blue-500 to-indigo-600',
    trendKey: 'ordersTrend',
  },
  {
    key: 'avgOrderValue',
    label: 'Avg Order Value',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
    format: 'currency',
    trendKey: 'aovTrend',
  },
  {
    key: 'packingRevenue',
    label: 'Packing Revenue',
    icon: Package,
    color: 'from-lime-600 to-green-700',
    format: 'currency',
    trendKey: 'packingRevenueTrend',
  },
  {
    key: 'avgPackingPerOrder',
    label: 'Avg Packing / Order',
    icon: Package,
    color: 'from-green-600 to-emerald-700',
    format: 'currency',
  },
  {
    key: 'netProfit',
    label: 'Net Profit',
    icon: Wallet,
    color: 'from-emerald-500 to-teal-600',
    format: 'currency',
    trendKey: 'profitTrend',
  },
  {
    key: 'foodCost',
    label: 'Food Cost',
    icon: UtensilsCrossed,
    color: 'from-amber-500 to-orange-500',
    format: 'currency',
  },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'from-red-500 to-rose-600' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'from-orange-500 to-orange-600' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'from-teal-500 to-cyan-600' },
  {
    key: 'satisfaction',
    label: 'Satisfaction',
    icon: Star,
    color: 'from-yellow-500 to-amber-500',
    suffix: '★',
  },
] as const;

export function ReportsKpiCards({
  kpis,
  live,
  loading,
}: {
  kpis?: ReportsKpiDto;
  live?: ReportsLiveDto;
  loading?: boolean;
}) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPI_CARDS.map(({ key, label, icon: Icon, color, format, trendKey, suffix }, i) => {
          const val = kpis[key as keyof ReportsKpiDto];
          const trend = trendKey ? (kpis[trendKey as keyof ReportsKpiDto] as number) : undefined;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2, scale: 1.01 }}
              className={cn(
                'rounded-2xl bg-gradient-to-br text-white p-4 shadow-lg relative overflow-hidden',
                color,
              )}
            >
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_20%,white,transparent_50%)]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 opacity-90">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[9px] uppercase tracking-wider font-bold">{label}</span>
                  </div>
                  {trend !== undefined && <TrendBadge value={trend} />}
                </div>
                <p className="text-2xl font-bold">
                  {format === 'currency' ? formatCurrency(val as number) : `${val}${suffix ?? ''}`}
                </p>
                <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white/50 rounded-full"
                    style={{ width: `${Math.min(100, 40 + i * 7)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {live && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Live Kitchen Queue', value: live.kitchenQueue },
            { label: 'Delivery Queue', value: live.deliveryQueue },
            { label: 'Revenue Today', value: formatCurrency(live.revenueToday) },
            { label: 'Active Orders', value: live.activeOrders },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur p-3 shadow-sm"
            >
              <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                {item.label}
              </p>
              <p className="text-lg font-bold text-[#14532D] mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
