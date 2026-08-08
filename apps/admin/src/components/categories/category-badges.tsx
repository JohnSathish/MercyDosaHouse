'use client';

import type { CategoryStatus, CategoryBadge } from '@mdh/types';
import { Badge, cn } from '@mdh/ui';

const STATUS_STYLES: Record<CategoryStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40',
  HIDDEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40',
  INACTIVE: 'bg-red-100 text-red-700 dark:bg-red-900/40',
  SEASONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40',
};

const STATUS_LABELS: Record<CategoryStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  HIDDEN: 'Hidden',
  INACTIVE: 'Inactive',
  SEASONAL: 'Seasonal',
};

const BADGE_STYLES: Record<CategoryBadge, string> = {
  NEW: 'bg-blue-500 text-white',
  HOT: 'bg-red-500 text-white',
  BEST_SELLER: 'bg-amber-500 text-white',
  LIMITED: 'bg-purple-500 text-white',
  SPICY: 'bg-orange-500 text-white',
  VEG: 'bg-green-600 text-white',
  NON_VEG: 'bg-rose-600 text-white',
};

export function CategoryStatusBadge({ status }: { status: CategoryStatus | string }) {
  const s = status as CategoryStatus;
  return (
    <Badge className={cn('text-[10px] font-semibold', STATUS_STYLES[s] ?? STATUS_STYLES.DRAFT)}>
      {s === 'PUBLISHED' ? '🟢 ' : ''}
      {STATUS_LABELS[s] ?? status}
    </Badge>
  );
}

export function CategoryBadgePill({
  badge,
  className,
}: {
  badge: CategoryBadge;
  className?: string;
}) {
  return (
    <Badge className={cn('text-[9px] font-bold uppercase', BADGE_STYLES[badge], className)}>
      {badge.replace('_', ' ')}
    </Badge>
  );
}
