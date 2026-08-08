'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { CategoryDashboardDto } from '@mdh/types';
import {
  Layers,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  TrendingUp,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@mdh/ui';

const STAT_CARDS = [
  {
    key: 'totalCategories',
    label: 'Total Categories',
    icon: Layers,
    color: 'from-[#14532D] to-emerald-700',
  },
  { key: 'active', label: 'Active', icon: CheckCircle2, color: 'from-emerald-500 to-teal-600' },
  { key: 'inactive', label: 'Inactive', icon: XCircle, color: 'from-gray-500 to-gray-600' },
  {
    key: 'menuItems',
    label: 'Menu Items',
    icon: UtensilsCrossed,
    color: 'from-blue-500 to-indigo-600',
  },
] as const;

export function CategoryDashboard({
  data,
  loading,
}: {
  data?: CategoryDashboardDto;
  loading?: boolean;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxRev = Math.max(...data.widgets.revenueByCategory.map((r) => r.revenue), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2, scale: 1.01 }}
            className={cn('rounded-2xl bg-gradient-to-br text-white p-5 shadow-lg', color)}
          >
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Icon className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
            </div>
            <p className="text-3xl font-bold">{data.stats[key]}</p>
            {key === 'totalCategories' && (
              <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-white/60 rounded-full" style={{ width: '72%' }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Best Selling Category
          </div>
          <p className="text-2xl font-bold">{data.stats.bestSellingCategory}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-gray-900 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold mb-1">
            <IndianRupee className="h-4 w-4 text-amber-600" />
            Revenue This Month
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrency(data.stats.revenueThisMonth)}
          </p>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Widget title="Revenue by Category">
          <div className="space-y-2">
            {data.widgets.revenueByCategory.slice(0, 5).map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="font-bold">{formatCurrency(r.revenue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#14532D]"
                    style={{ width: `${(r.revenue / maxRev) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Widget>
        <Widget title="Recently Updated">
          {data.widgets.recentlyUpdated.slice(0, 4).map((c) => (
            <div key={c.id} className="flex justify-between py-1.5 border-b text-sm">
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </Widget>
        <Widget title="Inactive Categories">
          {data.widgets.inactiveCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">All categories active</p>
          ) : (
            data.widgets.inactiveCategories.slice(0, 4).map((c) => (
              <div key={c.id} className="flex justify-between py-1.5 border-b text-sm">
                <span>{c.name}</span>
                <span className="text-xs text-red-500">{c.status}</span>
              </div>
            ))
          )}
        </Widget>
      </div>
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur p-5 shadow-sm">
      <h3 className="font-semibold mb-3 text-sm">{title}</h3>
      {children}
    </div>
  );
}
