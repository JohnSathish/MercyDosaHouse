'use client';

import { Card, CardContent } from '@mdh/ui';
import { cn } from '@mdh/ui';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'gray';
}

const accentMap = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  gray: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'green' }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm dark:bg-gray-900 dark:border-gray-800 h-full w-full">
      <CardContent className="p-4 lg:p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
            <p className="text-xl sm:text-2xl xl:text-3xl font-bold mt-1 truncate">{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={cn('rounded-xl p-2.5 shrink-0', accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden w-full">
          <div
            className={cn('h-full w-2/3 rounded-full opacity-60', accentMap[accent].split(' ')[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
