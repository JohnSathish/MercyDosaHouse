'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Settings,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Users,
} from 'lucide-react';
import { cn } from '@mdh/ui';
import type { ActivityDashboardDto } from '@mdh/types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

const KPI_CONFIG = [
  {
    key: 'todayActivities',
    label: "Today's Activities",
    icon: Activity,
    color: 'from-[#14532D] to-emerald-700',
    severity: 'success',
  },
  {
    key: 'criticalEvents',
    label: 'Critical Events',
    icon: AlertTriangle,
    color: 'from-purple-600 to-purple-800',
    severity: 'critical',
  },
  {
    key: 'failedLogins',
    label: 'Failed Logins',
    icon: ShieldAlert,
    color: 'from-red-500 to-rose-600',
    severity: 'error',
  },
  {
    key: 'adminChanges',
    label: 'Admin Changes',
    icon: Settings,
    color: 'from-slate-600 to-slate-800',
    severity: 'info',
  },
  {
    key: 'newOrders',
    label: 'New Orders',
    icon: ShoppingBag,
    color: 'from-blue-500 to-indigo-600',
    severity: 'info',
  },
  {
    key: 'menuUpdates',
    label: 'Menu Updates',
    icon: UtensilsCrossed,
    color: 'from-emerald-500 to-teal-600',
    severity: 'success',
  },
  {
    key: 'cmsChanges',
    label: 'CMS Changes',
    icon: FileText,
    color: 'from-violet-500 to-purple-600',
    severity: 'info',
  },
  {
    key: 'usersOnline',
    label: 'Users Online',
    icon: Users,
    color: 'from-cyan-500 to-blue-600',
    severity: 'success',
  },
] as const;

function MiniTrend({ seed }: { seed: number }) {
  const data = Array.from({ length: 8 }, (_, i) => ({
    v: 20 + Math.sin(i + seed) * 10 + (seed % 5) * 3,
  }));
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={data}>
        <Area
          type="monotone"
          dataKey="v"
          stroke="rgba(255,255,255,0.8)"
          fill="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ActivityKpiCards({
  stats,
  loading,
}: {
  stats?: ActivityDashboardDto['stats'];
  loading?: boolean;
}) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color }, i) => {
          const val = stats[key as keyof typeof stats] as number;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2, scale: 1.01 }}
              className={cn(
                'rounded-2xl bg-gradient-to-br text-white p-3 shadow-lg relative overflow-hidden backdrop-blur',
                color,
              )}
            >
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_20%,white,transparent_50%)]" />
              <div className="relative">
                <div className="flex items-center gap-1 opacity-90 mb-1">
                  <Icon className="h-3 w-3" />
                  <span className="text-[8px] uppercase tracking-wider font-bold leading-tight">
                    {label}
                  </span>
                </div>
                <p className="text-xl font-bold">
                  <AnimatedNumber value={val} />
                </p>
                <MiniTrend seed={i + val} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground text-right">
        Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
