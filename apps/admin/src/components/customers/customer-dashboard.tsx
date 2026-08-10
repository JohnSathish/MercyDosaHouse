'use client';

import { motion } from 'framer-motion';
import { formatCurrency } from '@mdh/utils';
import type { CustomerDashboardDto } from '@mdh/types';
import {
  Users,
  UserPlus,
  Repeat,
  Crown,
  UserX,
  IndianRupee,
  TrendingUp,
  Cake,
  Star,
} from 'lucide-react';
import { cn } from '@mdh/ui';

const STAT_CARDS = [
  {
    key: 'totalCustomers',
    label: 'Total Customers',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
  },
  {
    key: 'newToday',
    label: "Today's New",
    icon: UserPlus,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    key: 'repeatCustomers',
    label: 'Repeat Customers',
    icon: Repeat,
    color: 'from-purple-500 to-purple-600',
  },
  {
    key: 'vipCustomers',
    label: 'VIP Customers',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
  },
  { key: 'inactiveCustomers', label: 'Inactive', icon: UserX, color: 'from-gray-500 to-gray-600' },
  {
    key: 'avgOrderValue',
    label: 'Avg Order Value',
    icon: IndianRupee,
    color: 'from-teal-500 to-teal-600',
    format: 'currency',
  },
  {
    key: 'lifetimeRevenue',
    label: 'Lifetime Revenue',
    icon: TrendingUp,
    color: 'from-[#14532D] to-emerald-700',
    format: 'currency',
  },
] as const;

interface CustomerDashboardProps {
  data?: CustomerDashboardDto;
  loading?: boolean;
}

export function CustomerDashboard({ data, loading }: CustomerDashboardProps) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxGrowth = Math.max(...data.growth.map((g) => g.newCustomers), 1);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {STAT_CARDS.map((card, i) => {
          const { key, label, icon: Icon, color } = card;
          const format = 'format' in card ? card.format : undefined;
          const val = data.stats[key as keyof typeof data.stats];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn('rounded-xl bg-gradient-to-br text-white p-4 shadow-sm', color)}
            >
              <div className="flex items-center gap-2 mb-2 opacity-90">
                <Icon className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span>
              </div>
              <p className="text-xl lg:text-2xl font-bold">
                {format === 'currency' ? formatCurrency(val as number) : val}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Growth chart */}
        <div className="lg:col-span-2 rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Customer Growth</h3>
          <div className="flex items-end gap-3 h-40">
            {data.growth.map((g) => (
              <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5 h-32 justify-end">
                  <div
                    className="w-full rounded-t bg-[#14532D]/80"
                    style={{ height: `${(g.newCustomers / maxGrowth) * 100}%`, minHeight: 4 }}
                    title={`New: ${g.newCustomers}`}
                  />
                  <div
                    className="w-full rounded-t bg-[#F59E0B]/80"
                    style={{ height: `${(g.repeatCustomers / maxGrowth) * 100}%`, minHeight: 2 }}
                    title={`Repeat: ${g.repeatCustomers}`}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{g.month}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-[#14532D]" /> New
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-[#F59E0B]" /> Repeat
            </span>
          </div>
        </div>

        {/* Widgets */}
        <div className="space-y-4">
          <WidgetCard title="Top Spenders" icon={TrendingUp}>
            {data.topSpenders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ul className="space-y-2">
                {data.topSpenders.map((c, i) => (
                  <li key={c.id} className="flex justify-between text-sm">
                    <span>
                      {i + 1}. {c.name}
                    </span>
                    <span className="font-semibold text-[#14532D]">
                      {formatCurrency(c.totalSpent)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>

          <WidgetCard title="Birthdays Today" icon={Cake}>
            {data.birthdaysToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">None today</p>
            ) : (
              <ul className="space-y-1">
                {data.birthdaysToday.map((c) => (
                  <li key={c.id} className="text-sm">
                    {c.name} — {c.phone}
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>

          <WidgetCard title="Pending Reviews" icon={Star}>
            <p className="text-2xl font-bold text-[#F59E0B]">{data.pendingReviews}</p>
          </WidgetCard>
        </div>
      </div>
    </div>
  );
}

function WidgetCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[#14532D]" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  );
}
