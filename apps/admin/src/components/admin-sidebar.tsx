'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { AdminBrand } from '@/lib/use-admin-brand';
import { AdminSidebarNav } from '@/components/admin-sidebar-nav';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  brand: AdminBrand;
  brandLoading?: boolean;
  userName?: string;
  userEmail?: string;
}

function LogoMark({ brand, collapsed }: { brand: AdminBrand; collapsed: boolean }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white/25',
        collapsed ? 'h-11 w-11' : 'h-12 w-12',
      )}
    >
      <Image
        src={brand.logoUrl}
        alt={brand.businessName}
        fill
        className="object-cover"
        sizes={collapsed ? '44px' : '48px'}
        unoptimized
      />
    </div>
  );
}

function LogoSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'shrink-0 animate-pulse rounded-full bg-white/20',
        collapsed ? 'h-11 w-11' : 'h-12 w-12',
      )}
    />
  );
}

export function AdminSidebar({
  collapsed,
  onToggle,
  brand,
  brandLoading,
  userName = 'Admin',
  userEmail,
}: AdminSidebarProps) {
  const initial = userName.charAt(0).toUpperCase() || 'A';

  return (
    <aside
      className={cn(
        'z-40 hidden h-full min-h-0 shrink-0 flex-col border-r border-white/10 bg-[#0B3D24] text-white transition-all duration-300 ease-in-out md:flex',
        collapsed ? 'w-[84px]' : 'w-[280px]',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-white/10',
          collapsed ? 'justify-center px-3 py-4' : 'px-4 py-4',
        )}
      >
        {brandLoading ? (
          <LogoSkeleton collapsed={collapsed} />
        ) : (
          <LogoMark brand={brand} collapsed={collapsed} />
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight">
              {brand.businessName}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55">
              <span className="truncate">Restaurant Dashboard</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                online
              </span>
            </div>
          </div>
        )}
      </div>

      <AdminSidebarNav collapsed={collapsed} className="min-h-0" />

      <div className="mt-auto shrink-0 border-t border-white/10">
        {!collapsed ? (
          <Link
            href="/settings"
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-sm font-bold text-emerald-200 ring-1 ring-white/10">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-[11px] text-white/45">
                {userEmail || 'superadmin@mercy.com'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
          </Link>
        ) : (
          <div className="flex justify-center py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/25 text-sm font-bold text-emerald-200">
              {initial}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-2 border-t border-white/10 py-3.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>
      </div>
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
    <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
      {brandLoading ? (
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      ) : (
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-[#14532D]/20">
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
