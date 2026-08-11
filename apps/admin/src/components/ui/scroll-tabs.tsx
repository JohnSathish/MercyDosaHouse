'use client';

import { cn } from '@mdh/ui';
import type { LucideIcon } from 'lucide-react';

export interface ScrollTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface ScrollTabsProps<T extends string> {
  tabs: ScrollTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Horizontally scrollable tab strip — mobile-friendly module tabs. */
export function ScrollTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: ScrollTabsProps<T>) {
  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300',
        className,
      )}
    >
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-semibold transition-colors whitespace-nowrap',
            value === id
              ? 'bg-[#14532D] text-white shadow-sm'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
          )}
        >
          {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}
