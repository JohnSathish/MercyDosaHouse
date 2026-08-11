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
        className="p-0 bg-[#14532D] text-white border-0 max-w-[min(100vw,320px)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {brandLoading ? (
              <div className="h-10 w-10 rounded-xl bg-white/20 animate-pulse shrink-0" />
            ) : (
              <div className="relative h-10 w-10 rounded-xl overflow-hidden ring-2 ring-white/20 shrink-0">
                <Image
                  src={brand.logoUrl}
                  alt={brand.businessName}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{brand.businessName}</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Restaurant ERP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              'text-white/80 hover:bg-white/10 hover:text-white transition-colors',
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
