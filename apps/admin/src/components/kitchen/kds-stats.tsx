'use client';

import { cn } from '@mdh/ui';
import type { KitchenStatsDto } from '@mdh/types';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, Timer, ShoppingBag } from 'lucide-react';

const STAT_ITEMS = [
  { key: 'activeOrders', label: 'Active Orders', icon: ShoppingBag, color: 'text-blue-400' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-orange-400' },
  { key: 'ready', label: 'Ready', icon: CheckCircle2, color: 'text-emerald-400' },
  { key: 'completedToday', label: 'Completed Today', icon: CheckCircle2, color: 'text-gray-400' },
  {
    key: 'avgPrepMinutes',
    label: 'Avg Cook Time',
    icon: Timer,
    color: 'text-purple-400',
    suffix: ' min',
  },
  { key: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'text-red-400' },
] as const;

export function KdsStatsBar({ stats }: { stats: KitchenStatsDto }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_ITEMS.map(({ key, label, icon: Icon, color, suffix }) => (
        <div key={key} className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
              {label}
            </span>
          </div>
          <p className={cn('text-2xl font-bold', color)}>
            {stats[key]}
            {suffix ?? ''}
          </p>
        </div>
      ))}
    </div>
  );
}

export function KdsLiveIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <span className="text-red-400 font-semibold">Live</span>
      <span className="text-gray-400">•</span>
      <span className="text-white font-bold">{count} Active Orders</span>
    </div>
  );
}
