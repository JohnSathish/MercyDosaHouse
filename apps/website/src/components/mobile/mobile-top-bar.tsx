'use client';

import { useRouter } from 'next/navigation';
import { Menu, ShoppingCart, Smartphone } from 'lucide-react';
import { SiteLogoMark } from '@/components/site-logo';
import { ANDROID_APP_URL, BRAND, formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { useUiStore } from '@/lib/ui-store';
import { useEffect, useState } from 'react';

export function MobileTopBar({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const { setDrawerOpen, openCart } = useUiStore();

  useEffect(() => setMounted(true), []);

  const count = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  const subtotal = mounted ? items.reduce((n, i) => n + i.product.price * i.quantity, 0) : 0;

  return (
    <header
      className={`lg:hidden ${embedded ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 h-14 border-b border-[#0B542F]/10 bg-[#FFF8E8]/95 text-[#18352A] shadow-sm backdrop-blur-md`}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A000]"
          aria-label={`${BRAND.name} home`}
        >
          <SiteLogoMark size="sm" showName />
        </button>
        <div className="flex items-center gap-0.5">
          <a
            href={ANDROID_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 min-w-11 items-center justify-center rounded-xl text-[#0B542F]"
            aria-label="Download the Mercy Dosa House app"
          >
            <Smartphone className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-11 min-w-11 items-center justify-center rounded-xl text-[#0B542F]"
            aria-label={
              count > 0 ? `Open cart, ${count} items, ${formatCurrency(subtotal)}` : 'Open cart'
            }
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F5A000] px-1 text-[9px] font-bold text-[#18352A]">
                {count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#0B542F]"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
