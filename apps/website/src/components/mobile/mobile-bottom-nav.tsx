'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingCart, Heart, User } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useUiStore } from '@/lib/ui-store';
import { cn } from '@mdh/ui';
import { useEffect, useState } from 'react';

const HIDDEN_PATHS = ['/login', '/checkout', '/order/success'];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const [mounted, setMounted] = useState(false);
  const cartCount = useCartStore((s) => s.totalItems());
  const openCart = useUiStore((s) => s.openCart);

  useEffect(() => setMounted(true), []);

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  if (pathname.startsWith('/profile')) return null;

  const count = mounted ? cartCount : 0;

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { action: 'cart' as const, label: 'Cart', icon: ShoppingCart, badge: count },
    { href: '/profile?tab=favorites', label: 'Favorites', icon: Heart, match: '/profile' },
    { href: '/profile', label: 'Profile', icon: User, match: '/profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] safe-area-pb">
      <div className="flex justify-around items-center h-16 px-1">
        {links.map(({ href, label, icon: Icon, badge, action, match }) => {
          const active = match
            ? pathname.startsWith('/profile') &&
              (label === 'Favorites'
                ? tab === 'favorites'
                : label === 'Profile'
                  ? !tab || tab === 'dashboard'
                  : false)
            : href === '/'
              ? pathname === '/'
              : pathname.startsWith(href?.split('?')[0] ?? '');

          if (action === 'cart') {
            return (
              <button
                key={label}
                type="button"
                onClick={openCart}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-2xl text-[10px] font-semibold transition-colors active:scale-95',
                  active ? 'text-[#14532D]' : 'text-gray-500',
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'text-[#F59E0B]')} />
                {label}
                {badge != null && badge > 0 && (
                  <span className="absolute top-0.5 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[9px] font-bold text-[#1F2937]">
                    {badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={href!}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-2xl text-[10px] font-semibold transition-colors active:scale-95',
                active ? 'text-[#14532D]' : 'text-gray-500',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-[#F59E0B]')} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
