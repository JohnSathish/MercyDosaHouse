'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@mdh/ui';
import type { DashboardStatsDto } from '@mdh/types';
import { api } from '@/lib/api';
import { ADMIN_NAV_GROUPS, type AdminNavItem } from '@/lib/admin-nav';

interface AdminSidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

function resolveBadge(item: AdminNavItem, pendingOrders?: number): string | undefined {
  if (item.liveBadge === 'pendingOrders') {
    if (!pendingOrders || pendingOrders <= 0) return undefined;
    return pendingOrders > 99 ? '99+' : String(pendingOrders);
  }
  return item.badge;
}

function BadgePill({ value, tone }: { value: string; tone?: AdminNavItem['badgeTone'] }) {
  if (tone === 'count') {
    return (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-[#0B3D24]">
        {value}
      </span>
    );
  }
  if (tone === 'alert') {
    return (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
        {value}
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80">
      {value}
    </span>
  );
}

export function AdminSidebarNav({
  collapsed = false,
  onNavigate,
  className,
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStatsDto>('/dashboard/stats'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <nav
      className={cn('min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin', className)}
    >
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {group.title}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const external = item.href.startsWith('mailto:');
              const active =
                !external &&
                (item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`));
              const badge = resolveBadge(item, stats?.pendingOrders);
              const classNameLink = cn(
                'group flex items-center gap-3 rounded-full text-[13px] transition-all duration-150',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3.5 py-2.5',
                active
                  ? 'bg-white/15 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  : 'font-medium text-white/75 hover:bg-white/10 hover:text-white',
              );

              const content = (
                <>
                  <Icon
                    className={cn(
                      'shrink-0 opacity-90',
                      collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4',
                      active && 'opacity-100',
                    )}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {badge && <BadgePill value={badge} tone={item.badgeTone} />}
                    </>
                  )}
                  {collapsed && badge && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </>
              );

              if (external) {
                return (
                  <a
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavigate}
                    className={cn(classNameLink, 'relative')}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={cn(classNameLink, 'relative')}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
