'use client';

import { cn } from '@mdh/ui';
import type { ActivitySeverity } from '@mdh/types';

const SEVERITY_STYLES: Record<ActivitySeverity, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  WARNING: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  CRITICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
};

const SEVERITY_DOT: Record<ActivitySeverity, string> = {
  INFO: 'bg-blue-500',
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-orange-500',
  ERROR: 'bg-red-500',
  CRITICAL: 'bg-purple-500',
};

export function ActivitySeverityBadge({ severity }: { severity: ActivitySeverity | string }) {
  const key =
    (severity as ActivitySeverity) in SEVERITY_STYLES ? (severity as ActivitySeverity) : 'INFO';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
        SEVERITY_STYLES[key],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[key])} />
      {key}
    </span>
  );
}

export function severityEmoji(severity: string) {
  switch (severity) {
    case 'SUCCESS':
      return '🟢';
    case 'WARNING':
      return '🟠';
    case 'ERROR':
      return '🔴';
    case 'CRITICAL':
      return '🔴';
    case 'INFO':
    default:
      return '🔵';
  }
}
