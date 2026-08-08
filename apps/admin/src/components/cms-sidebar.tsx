'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
import { ADMIN_NAV_GROUPS } from '@/lib/api';

export function CmsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/50">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-primary-foreground/15 font-semibold'
                      : 'hover:bg-primary-foreground/10 opacity-90',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
