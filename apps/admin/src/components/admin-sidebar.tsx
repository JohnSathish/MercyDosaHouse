'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Menu } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { AdminBrand } from '@/lib/use-admin-brand';
import { AdminSidebarNav } from '@/components/admin-sidebar-nav';

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

      <AdminSidebarNav collapsed={collapsed} />

      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center gap-2 border-t border-white/10 py-3 min-h-[44px] text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        {!collapsed && <span>Collapse sidebar</span>}
      </button>
    </aside>
  );
}

/** Compact logo link shown in mobile header when sidebar is hidden. */
export function AdminMobileBrand({
  brand,
  brandLoading,
}: {
  brand: AdminBrand;
  brandLoading?: boolean;
}) {
  return (
    <Link href="/" className="flex items-center gap-2 min-w-0 shrink-0">
      {brandLoading ? (
        <div className="h-9 w-9 rounded-lg bg-muted animate-pulse shrink-0" />
      ) : (
        <div className="relative h-9 w-9 rounded-lg overflow-hidden ring-1 ring-[#14532D]/20 shrink-0">
          <Image
            src={brand.logoUrl}
            alt={brand.businessName}
            fill
            className="object-cover"
            sizes="36px"
            unoptimized
          />
        </div>
      )}
    </Link>
  );
}
