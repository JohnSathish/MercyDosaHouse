'use client';

import Link from 'next/link';
import { cn } from '@mdh/ui';
import type { LucideIcon } from 'lucide-react';

export interface ResponsiveSubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface ResponsiveSubNavProps {
  items: ResponsiveSubNavItem[];
  pathname: string;
  className?: string;
}

/** Horizontally scrollable sub-navigation for module sections (Reports, Delivery, etc.). */
export function ResponsiveSubNav({ items, pathname, className }: ResponsiveSubNavProps) {
  return (
    <nav
      className={cn(
        'flex gap-1 mb-6 p-1 bg-muted/50 rounded-xl overflow-x-auto scrollbar-thin',
        className,
      )}
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
              active
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-white dark:hover:bg-gray-800 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
