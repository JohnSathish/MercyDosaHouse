'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
import { LayoutDashboard, List, Shield, KeyRound, Monitor, Download } from 'lucide-react';

const ACTIVITY_NAV = [
  { href: '/activity', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/activity/logs', label: 'All Logs', icon: List },
  { href: '/activity/security', label: 'Security', icon: Shield },
  { href: '/activity/login', label: 'Login History', icon: KeyRound },
  { href: '/activity/sessions', label: 'Sessions', icon: Monitor },
  { href: '/activity/export', label: 'Export', icon: Download },
];

export function ActivityNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
      {ACTIVITY_NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              active
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-white dark:hover:bg-gray-800 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <ActivityNav />
      {children}
    </div>
  );
}
