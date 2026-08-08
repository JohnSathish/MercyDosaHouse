'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

export function DashboardMobileNav() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.totalItems());

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/profile?tab=orders', label: 'Orders', icon: ShoppingBag, match: '/profile' },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: count },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-pb">
      <div className="flex justify-around items-center h-16 px-2">
        {links.map(({ href, label, icon: Icon, badge, match }) => {
          const active = match ? pathname.startsWith(match) : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-medium transition-colors relative ${
                active ? 'text-[#14532D]' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-secondary' : ''}`} />
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute top-0 right-1 bg-secondary text-[#1F2937] text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
