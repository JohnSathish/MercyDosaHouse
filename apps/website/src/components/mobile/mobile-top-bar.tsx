'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { SiteLogoMark } from '@/components/site-logo';
import { BRAND, formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { useUiStore } from '@/lib/ui-store';
import { useEffect, useState } from 'react';

export function MobileTopBar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const { setDrawerOpen, openCart, setSearchOpen } = useUiStore();

  useEffect(() => setMounted(true), []);

  const count = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  const subtotal = mounted ? items.reduce((n, i) => n + i.product.price * i.quantity, 0) : 0;

  return (
    <header
      className={`lg:hidden ${embedded ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 h-16 border-b border-[#14532D]/10 bg-[#FFFDF8]/95 text-[#1F2937] shadow-sm backdrop-blur-xl`}
    >
      <div className="flex h-16 items-center justify-between px-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#14532D] transition hover:bg-[#14532D]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="absolute left-1/2 -translate-x-1/2 inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] active:scale-95"
          aria-label={`${BRAND.name} home`}
        >
          <SiteLogoMark size="sm" showName />
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (pathname === '/menu') {
                setSearchOpen(true);
              } else {
                router.push('/menu');
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#14532D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] active:scale-95"
            aria-label="Search menu"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-12 min-w-12 items-center justify-center gap-1 rounded-2xl px-1.5 text-[#14532D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] active:scale-95"
            aria-label={
              count > 0 ? `Open cart, ${count} items, ${formatCurrency(subtotal)}` : 'Open cart'
            }
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 ? (
              <span className="text-[10px] font-bold leading-none">{formatCurrency(subtotal)}</span>
            ) : null}
            {count > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[9px] font-bold text-[#1F2937]">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
