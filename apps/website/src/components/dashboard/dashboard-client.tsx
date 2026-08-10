'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Button } from '@mdh/ui';
import {
  isAuthenticated,
  logout,
  getStoredUser,
  isCustomer,
  getStaffPortalRedirect,
} from '@mdh/auth-client';
import { api, API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import type { OrderDto, ProductDto, AddressDto } from '@mdh/types';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardMobileNav } from './dashboard-mobile-nav';
import { LogoutDialog } from './logout-dialog';
import {
  DashboardHeader,
  DashboardOverview,
  OrdersPanel,
  FavoritesPanel,
  AddressesPanel,
  CouponsPanel,
  NotificationsPanel,
  SettingsPanel,
} from './dashboard-panels';
import type { DashboardSection, UserProfile } from './types';

const SECTION_TITLES: Record<DashboardSection, string> = {
  dashboard: 'Dashboard',
  orders: 'My Orders',
  favorites: 'Favorites',
  addresses: 'Saved Addresses',
  coupons: 'Coupons',
  notifications: 'Notifications',
  settings: 'Settings',
};

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as DashboardSection) || 'dashboard';
  const [section, setSection] = useState<DashboardSection>(tab);
  const [mounted, setMounted] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [storedUser, setStoredUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    setMounted(true);
    setStoredUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const user = getStoredUser();
    if (user && !isCustomer(user)) {
      const staffUrl = getStaffPortalRedirect(user, APP_URLS);
      if (staffUrl) window.location.href = staffUrl;
    }
  }, [mounted, router]);

  useEffect(() => {
    setSection(tab);
  }, [tab]);

  const navigate = useCallback(
    (s: DashboardSection) => {
      setSection(s);
      setDrawerOpen(false);
      router.push(s === 'dashboard' ? '/dashboard' : `/dashboard?tab=${s}`, { scroll: false });
    },
    [router],
  );

  const authed = mounted && isAuthenticated();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/users/me'),
    enabled: authed,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get<OrderDto[]>('/users/me/orders'),
    enabled: authed,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: () => api.get<ProductDto[]>('/users/me/favorites'),
    enabled: authed,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => api.get<AddressDto[]>('/users/me/addresses'),
    enabled: authed,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api.get<{ id: string; title: string; body: string; createdAt: string }[]>('/notifications'),
    enabled: authed,
  });

  const user = mounted ? (profile ?? storedUser) : null;
  const userName = mounted ? (profile?.name ?? storedUser?.name) : undefined;

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout(API_URL);
      setLogoutOpen(false);
      toast('Logged out successfully.');
      router.push('/');
    } finally {
      setLogoutLoading(false);
    }
  };

  const renderContent = () => {
    switch (section) {
      case 'orders':
        return <OrdersPanel orders={orders} />;
      case 'favorites':
        return <FavoritesPanel favorites={favorites} />;
      case 'addresses':
        return (
          <AddressesPanel
            addresses={addresses}
            defaultContactName={userName}
            defaultMobile={profile?.phone ?? storedUser?.phone ?? undefined}
          />
        );
      case 'coupons':
        return <CouponsPanel />;
      case 'notifications':
        return <NotificationsPanel notifications={notifications} />;
      case 'settings':
        return <SettingsPanel userName={userName} phone={profile?.phone ?? storedUser?.phone} />;
      default:
        return (
          <DashboardOverview
            userName={userName}
            orders={orders}
            favorites={favorites}
            addresses={addresses}
            onSectionChange={navigate}
          />
        );
    }
  };

  return (
    <>
      <div className="flex gap-8 pb-24 lg:pb-12">
        <DashboardSidebar
          user={user as UserProfile | null}
          active={section}
          onNavigate={navigate}
          onLogoutClick={() => setLogoutOpen(true)}
          orderCount={orders.length}
        />

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl p-4 overflow-y-auto"
            >
              <DashboardSidebar
                user={user as UserProfile | null}
                active={section}
                onNavigate={navigate}
                onLogoutClick={() => {
                  setDrawerOpen(false);
                  setLogoutOpen(true);
                }}
                orderCount={orders.length}
                mobile
              />
            </motion.aside>
          </div>
        )}

        <motion.main
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-3 mb-4 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="gap-2"
            >
              <Menu className="w-4 h-4" /> Menu
            </Button>
            <span className="font-bold text-[#14532D]">{SECTION_TITLES[section]}</span>
          </div>

          {section === 'dashboard' && <DashboardHeader userName={userName} />}
          {section !== 'dashboard' && (
            <h1 className="text-2xl font-bold text-[#14532D] mb-6">{SECTION_TITLES[section]}</h1>
          )}

          {renderContent()}
        </motion.main>
      </div>

      <DashboardMobileNav />
      <LogoutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />
    </>
  );
}

export function DashboardClient() {
  return (
    <Suspense
      fallback={<div className="py-20 text-center text-gray-500">Loading dashboard...</div>}
    >
      <DashboardInner />
    </Suspense>
  );
}
