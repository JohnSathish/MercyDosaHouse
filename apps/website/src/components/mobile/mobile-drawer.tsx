'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, UtensilsCrossed, User, Tag, Truck, Info, Phone, Star, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SiteLogo } from '@/components/site-logo';
import { GooglePlayBadge } from '@/components/google-play-badge';
import { useUiStore } from '@/lib/ui-store';
import { isAuthenticated, logout, getStoredUser } from '@mdh/auth-client';
import { getHeaderDisplayName } from '@/components/dashboard/types';
import { API_URL } from '@/lib/api';
import { cn } from '@mdh/ui';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/offers', label: 'Offers', icon: Tag },
  { href: '/about', label: 'About Us', icon: Info },
  { href: '/track', label: 'Order Tracking', icon: Truck, matchPrefix: '/track' },
  { href: '/contact', label: 'Contact Us', icon: Phone },
  { href: '/profile?tab=feedback', label: 'My Feedback', icon: Star },
];

export function MobileDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { drawerOpen, setDrawerOpen } = useUiStore();
  const user = getStoredUser();
  const authed = isAuthenticated();

  const close = () => setDrawerOpen(false);

  const handleLogout = async () => {
    await logout(API_URL);
    close();
    router.push('/');
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="left" className="p-0">
        <SheetHeader>
          <SheetTitle className="sr-only">Site menu</SheetTitle>
          <SiteLogo size="md" showName href="/" />
          {authed && user && (
            <p className="text-sm text-gray-500 mt-1">
              {getHeaderDisplayName(user.name, user.phone) || user.phone}
            </p>
          )}
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {authed && (
            <Link
              href="/profile"
              onClick={close}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2 bg-[#14532D]/5 text-[#14532D] font-semibold min-h-[48px] active:scale-[0.98] transition-transform"
            >
              <User className="h-5 w-5" />
              Profile
            </Link>
          )}

          {NAV_ITEMS.map(({ href, label, icon: Icon, matchPrefix }) => {
            const active = matchPrefix
              ? pathname.startsWith(matchPrefix)
              : label === 'Offers'
                ? false
                : href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(href.split('#')[0]) && href !== '/';

            return (
              <Link
                key={label}
                href={href}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-1 min-h-[48px] font-medium transition-all active:scale-[0.98]',
                  active
                    ? 'bg-[#14532D] text-white shadow-md'
                    : 'text-[#1F2937] hover:bg-[#FFF8E8]',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-3">
          <GooglePlayBadge size="md" className="w-full justify-center" />
        </div>

        <div className="border-t border-gray-100 p-4 safe-area-pb">
          {authed ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-600 font-semibold min-h-[48px] active:scale-[0.98] transition-transform"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14532D] px-4 py-3.5 text-white font-semibold min-h-[48px] active:scale-[0.98] transition-transform"
            >
              <User className="h-5 w-5" />
              Login
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
