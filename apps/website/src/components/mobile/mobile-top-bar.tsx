'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, ShoppingCart } from 'lucide-react';
import { SiteLogoMark } from '@/components/site-logo';
import { BRAND } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { useUiStore } from '@/lib/ui-store';
import { useEffect, useState } from 'react';

export function MobileTopBar({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());
  const { setDrawerOpen, openCart, setSearchOpen } = useUiStore();

  useEffect(() => setMounted(true), []);

  const isHome = pathname === '/';
  const count = mounted ? cartCount : 0;

  return (
    <header
      className={`lg:hidden ${embedded ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 h-16 transition-colors duration-300 ${
        isHome
          ? 'bg-[#14532D]/95 backdrop-blur-xl text-white border-b border-white/10'
          : 'bg-white/95 backdrop-blur-xl text-[#1F2937] border-b border-gray-100 shadow-sm'
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl active:scale-95 transition-transform"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="absolute left-1/2 -translate-x-1/2 inline-flex rounded-xl active:scale-95 transition-transform"
          aria-label={`${BRAND.name} home`}
        >
          <SiteLogoMark size="sm" showName className={isHome ? '[&_span]:text-white' : ''} />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (pathname === '/menu') {
                setSearchOpen(true);
              } else {
                router.push('/menu');
              }
            }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl active:scale-95 transition-transform"
            aria-label="Search menu"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl active:scale-95 transition-transform"
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-[#1F2937]">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
