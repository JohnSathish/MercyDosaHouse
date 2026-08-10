'use client';

import { formatCurrency } from '@mdh/utils';
import type { PosLiveAnalyticsDto } from '@mdh/types';
import { cn } from '@mdh/ui';
import { Clock, IndianRupee, ShoppingBag, Users } from 'lucide-react';

export function PosStatsBar({
  analytics,
  darkMode,
}: {
  analytics: PosLiveAnalyticsDto | null;
  darkMode: boolean;
}) {
  const items = [
    {
      icon: ShoppingBag,
      label: "Today's Orders",
      value: String(analytics?.ordersToday ?? 0),
      color: 'text-blue-600',
    },
    {
      icon: IndianRupee,
      label: 'Revenue',
      value: formatCurrency(analytics?.revenueToday ?? 0),
      color: 'text-emerald-600',
    },
    {
      icon: Users,
      label: 'Customers',
      value: String(analytics?.customersToday ?? 0),
      color: 'text-violet-600',
    },
    {
      icon: Clock,
      label: 'Avg Bill',
      value: formatCurrency(analytics?.avgBillValue ?? 0),
      color: 'text-amber-600',
    },
  ];

  return (
    <div
      className={cn(
        'shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 py-2 border-b',
        darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50/80 border-gray-100',
      )}
    >
      {items.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl border backdrop-blur-sm',
            darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-white/80 border-gray-200',
          )}
        >
          <div className={cn('p-1.5 rounded-lg bg-gray-100', color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
              {label}
            </p>
            <p className={cn('text-sm font-bold', color)}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
