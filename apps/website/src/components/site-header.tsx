'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiShoppingCart } from 'react-icons/fi';
import { Menu } from 'lucide-react';
import { SiteLogo } from '@/components/site-logo';
import { UserMenu } from '@/components/dashboard/user-menu';
import { HeaderBronzeBadge } from '@/components/loyalty/header-bronze-badge';
import { useCartStore } from '@/lib/cart-store';
import { useUiStore } from '@/lib/ui-store';
import { PRIMARY_NAV } from '@/lib/site-nav';
import { formatCurrency } from '@mdh/utils';

interface SiteHeaderProps {
  /** When true, header is inside the fixed top stack (not independently fixed) */
  embedded?: boolean;
}

export function SiteHeader({ embedded = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);

  useEffect(() => setMounted(true), []);

  const count = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  const subtotal = mounted ? items.reduce((n, i) => n + i.product.price * i.quantity, 0) : 0;

  return (
    <header
      className={`${embedded ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 border-b border-[#14532D]/10 bg-[#FFFDF8]/95 text-[#1F2937] shadow-sm backdrop-blur-xl`}
    >
      <div className="container mx-auto flex h-16 md:h-[4.5rem] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#14532D] transition hover:bg-[#14532D]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] xl:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <SiteLogo size="sm" showName href="/" />
        </div>

        <nav className="hidden xl:flex items-center gap-0.5" aria-label="Primary">
          {PRIMARY_NAV.map((item) => {
            const path = item.href.split('#')[0];
            const active =
              item.label === 'Offers'
                ? false
                : path === '/'
                  ? pathname === '/'
                  : pathname.startsWith(path);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] ${
                  active
                    ? 'text-[#14532D] bg-[#14532D]/5'
                    : 'text-[#374151] hover:bg-[#14532D]/5 hover:text-[#14532D]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <HeaderBronzeBadge />
          <Link
            href="/cart"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#14532D]/15 bg-white px-3 py-2 text-sm font-semibold text-[#14532D] shadow-sm transition hover:border-[#F59E0B]/50 hover:bg-[#FFF8E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            aria-label={count > 0 ? `Cart, ${count} items, ${formatCurrency(subtotal)}` : 'Cart'}
          >
            <span className="relative">
              <FiShoppingCart className="h-4 w-4" aria-hidden />
              {count > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-[#1F2937]">
                  {count}
                </span>
              ) : null}
            </span>
            <span className="hidden sm:inline">{mounted ? formatCurrency(subtotal) : '₹0'}</span>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
