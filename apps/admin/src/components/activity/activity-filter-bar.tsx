'use client';

import { Search } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { ActivityPeriod } from '@mdh/types';
import { ACTIVITY_MODULES } from '@mdh/types';

const PERIODS: { value: ActivityPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
];

const SEVERITIES = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL'];

interface ActivityFilterBarProps {
  period: ActivityPeriod;
  onPeriodChange: (p: ActivityPeriod) => void;
  search: string;
  onSearchChange: (s: string) => void;
  module: string;
  onModuleChange: (m: string) => void;
  severity: string;
  onSeverityChange: (s: string) => void;
  className?: string;
}

export function ActivityFilterBar({
  period,
  onPeriodChange,
  search,
  onSearchChange,
  module,
  onModuleChange,
  severity,
  onSeverityChange,
  className,
}: ActivityFilterBarProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-3', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search username, order, description, IP, module…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as ActivityPeriod)}
          className="rounded-xl border px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-900"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={module}
          onChange={(e) => onModuleChange(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-900"
        >
          <option value="">All Modules</option>
          {ACTIVITY_MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
          className="rounded-xl border px-3 py-2 text-xs font-semibold bg-white dark:bg-gray-900"
        >
          <option value="">All Severity</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
