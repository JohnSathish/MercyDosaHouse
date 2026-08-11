'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
import { ADMIN_NAV_GROUPS } from '@/lib/admin-nav';

interface AdminSidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function AdminSidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex-1 overflow-y-auto py-4 px-2 space-y-5', className)}>
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg text-sm transition-all duration-150 min-h-[44px]',
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                    active
                      ? 'bg-white/15 font-semibold text-white shadow-sm'
                      : 'text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15',
                  )}
                >
                  <Icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-[#F59E0B]/25 text-[#FDE68A]">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
