'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { cn } from '@mdh/ui';
import type { AdminBrand } from '@/lib/use-admin-brand';
import { AdminSidebarNav } from '@/components/admin-sidebar-nav';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AdminMobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: AdminBrand;
  brandLoading?: boolean;
}

export function AdminMobileDrawer({
  open,
  onOpenChange,
  brand,
  brandLoading,
}: AdminMobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="max-w-[min(100vw,320px)] border-0 bg-[#0B3D24] p-0 text-white"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {brandLoading ? (
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/20" />
            ) : (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
                <Image
                  src={brand.logoUrl}
                  alt={brand.businessName}
                  fill
                  className="object-cover"
                  sizes="44px"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{brand.businessName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55">
                Restaurant Dashboard
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  online
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              'text-white/80 transition-colors hover:bg-white/10 hover:text-white',
            )}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AdminSidebarNav onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
