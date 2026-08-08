'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Users, Globe, Key, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import type { SecurityDashboardDto } from '@mdh/types';
import { ActivitySeverityBadge } from '@/components/activity/activity-severity-badge';

const WIDGETS = [
  {
    key: 'failedLogins',
    label: 'Failed Login Attempts',
    icon: ShieldAlert,
    color: 'from-red-500 to-rose-600',
  },
  {
    key: 'blockedUsers',
    label: 'Blocked Users',
    icon: Users,
    color: 'from-orange-500 to-amber-600',
  },
  {
    key: 'suspiciousIps',
    label: 'Suspicious IPs',
    icon: Globe,
    color: 'from-purple-500 to-violet-600',
  },
  {
    key: 'multipleDeviceLogins',
    label: 'Multi-Device Logins',
    icon: Lock,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    key: 'passwordChanges',
    label: 'Password Changes',
    icon: Key,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    key: 'adminAccess',
    label: 'Admin Access Events',
    icon: Shield,
    color: 'from-slate-600 to-gray-800',
  },
] as const;

export default function ActivitySecurityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-security'],
    queryFn: () => api.get<SecurityDashboardDto>('/activity/security'),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="h-96 rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Security Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monitor threats, failed logins, and suspicious activity
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {WIDGETS.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl bg-gradient-to-br ${color} text-white p-4 shadow-lg`}
          >
            <div className="flex items-center gap-2 opacity-90 mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold">{label}</span>
            </div>
            <p className="text-3xl font-bold">
              {typeof data?.[key as keyof SecurityDashboardDto] === 'number'
                ? (data[key as keyof SecurityDashboardDto] as number)
                : 0}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Recent Security Events</h3>
        </div>
        <div className="divide-y">
          {data?.events?.length ? (
            data.events.map((event) => (
              <div key={event.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <ActivitySeverityBadge severity={event.severity} />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No security events today
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
