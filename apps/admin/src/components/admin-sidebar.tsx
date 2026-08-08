'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@mdh/ui';
import { ChevronRight, Menu } from 'lucide-react';
import { ADMIN_NAV_GROUPS } from '@/lib/admin-nav';
import type { AdminBrand } from '@/lib/use-admin-brand';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  brand: AdminBrand;
  brandLoading?: boolean;
}

function LogoMark({ brand, collapsed }: { brand: AdminBrand; collapsed: boolean }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl bg-white shadow-md ring-2 ring-white/20',
        collapsed ? 'h-10 w-10' : 'h-[60px] w-[60px]',
      )}
    >
      <Image
        src={brand.logoUrl}
        alt={brand.businessName}
        fill
        className="object-cover"
        sizes={collapsed ? '40px' : '60px'}
        unoptimized
      />
    </div>
  );
}

function LogoSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-xl bg-white/20 animate-pulse',
        collapsed ? 'h-10 w-10' : 'h-[60px] w-[60px]',
      )}
    />
  );
}

export function AdminSidebar({ collapsed, onToggle, brand, brandLoading }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 bg-[#14532D] text-white border-r border-white/10 transition-all duration-300 ease-in-out sticky top-0 h-screen z-40',
        collapsed ? 'w-20' : 'w-[280px]',
      )}
    >
      <div
        className={cn(
          'border-b border-white/10 flex items-center gap-3',
          collapsed ? 'p-3 justify-center' : 'p-4',
        )}
      >
        {brandLoading ? (
          <LogoSkeleton collapsed={collapsed} />
        ) : (
          <LogoMark brand={brand} collapsed={collapsed} />
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm leading-tight truncate">{brand.businessName}</h1>
            <p className="text-[10px] opacity-70 uppercase tracking-wider mt-0.5 truncate">
              Restaurant ERP
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/50">
              <span>{brand.version}</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
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
                    className={cn(
                      'flex items-center gap-3 rounded-lg text-sm transition-all duration-150',
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                      active
                        ? 'bg-white/15 font-semibold text-white shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
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

      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center gap-2 border-t border-white/10 py-3 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        {!collapsed && <span>Collapse sidebar</span>}
      </button>
    </aside>
  );
}
