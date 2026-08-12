'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Monitor,
  Moon,
  Sun,
  Plus,
  ChevronDown,
  LogOut,
  User,
  Settings,
  X,
  Menu,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@mdh/ui';
import { logout } from '@mdh/auth-client';
import { API_URL, QUICK_ACTIONS } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { ADMIN_NAV } from '@/lib/admin-nav';
import { getAdminPageTitle } from '@/lib/admin-page-title';
import type { AdminBrand } from '@/lib/use-admin-brand';
import type { ThemeMode } from '@/components/admin-layout-shell';
import { AdminMobileBrand } from '@/components/admin-sidebar';

interface AdminTopbarProps {
  userName: string;
  userEmail?: string;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  brand: AdminBrand;
  brandLoading?: boolean;
  onOpenMobileNav: () => void;
  onToggleSidebar?: () => void;
}

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'order',
    message: 'New order #MDH-1042 received',
    time: '2 min ago',
    unread: true,
  },
  {
    id: '2',
    type: 'inventory',
    message: 'Rice stock running low',
    time: '15 min ago',
    unread: true,
  },
  {
    id: '3',
    type: 'review',
    message: 'New 5-star review from Priya',
    time: '1 hr ago',
    unread: false,
  },
  { id: '4', type: 'payment', message: 'Payment received ₹450', time: '2 hrs ago', unread: false },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function AdminTopbar({
  userName,
  userEmail,
  themeMode,
  onThemeChange,
  brand,
  brandLoading,
  onOpenMobileNav,
  onToggleSidebar,
}: AdminTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = getAdminPageTitle(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;
  const initial = userName.charAt(0).toUpperCase() || 'A';

  const searchResults = searchQuery.trim()
    ? ADMIN_NAV.filter(
        (item) =>
          !item.href.startsWith('mailto:') &&
          item.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  const handleLogout = async () => {
    await logout(API_URL);
    router.push('/login');
  };

  const ThemeIcon = THEME_OPTIONS.find((o) => o.mode === themeMode)?.icon ?? Monitor;

  const closeSearch = () => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="relative z-30 w-full max-w-[100vw] shrink-0 border-b border-gray-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-gray-900">
      {/* Mobile header row */}
      <div className="flex h-14 min-h-[56px] items-center gap-2 px-3 md:hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 text-[#0B3D24]" />
        </button>

        <AdminMobileBrand brand={brand} brandLoading={brandLoading} />

        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-bold leading-tight text-[#0B3D24] dark:text-emerald-400">
            {pageTitle}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{brand.businessName}</p>
        </div>

        <button
          type="button"
          onClick={() => setMobileSearchOpen((o) => !o)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Search modules"
        >
          <Search className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>

        <button
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserOpen((o) => !o)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="User menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B3D24] text-sm font-bold text-white">
            {initial}
          </div>
        </button>
      </div>

      {mobileSearchOpen && (
        <div className="border-b px-3 pb-3 dark:border-gray-800 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="Search modules, orders, customers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border-0 bg-gray-100 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3D24]/25 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2"
              aria-label="Close search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          {searchQuery && searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={closeSearch}
                    className="flex min-h-[44px] items-center gap-2 px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Icon className="h-4 w-4 text-[#0B3D24]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Desktop header */}
      <div className="hidden h-16 items-center gap-3 px-4 lg:px-6 xl:px-8 md:flex">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#0B3D24] transition-colors hover:bg-gray-100 dark:text-emerald-300 dark:hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}

        <div className="relative min-w-0 flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search modules, orders, customers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="h-11 w-full rounded-full border border-gray-200/80 bg-gray-50 pl-11 pr-4 text-sm text-gray-800 shadow-inner transition focus:border-[#0B3D24]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B3D24]/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {searchOpen && searchQuery && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={closeSearch}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Icon className="h-4 w-4 text-[#0B3D24]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          {searchOpen && searchQuery && (
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            />
          )}
        </div>

        <Link
          href="/pos"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#0B3D24] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F4A2C]"
          title={`Open POS terminal (${APP_URLS.pos})`}
        >
          <Monitor className="h-4 w-4" />
          <span className="hidden xl:inline">Return to POS</span>
          <span className="xl:hidden">POS</span>
        </Link>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setQuickOpen((o) => !o)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B3D24] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F4A2C]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Quick Action</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80" />
          </button>
          {quickOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setQuickOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Icon className="h-4 w-4 text-[#0B3D24]" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setThemeOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Change theme"
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
          {themeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onThemeChange(mode);
                      setThemeOpen(false);
                    }}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800',
                      themeMode === mode && 'bg-[#0B3D24]/8 font-medium text-[#0B3D24]',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setUserOpen((o) => !o)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl py-1 pl-1.5 pr-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3D24] text-sm font-bold text-white">
            {initial}
          </div>
          <div className="hidden min-w-0 text-left xl:block">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {userName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">Super Admin</p>
          </div>
          <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 xl:block" />
        </button>
      </div>

      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-2 top-full z-50 mt-2 w-[min(calc(100vw-1rem),20rem)] overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 md:right-4 lg:right-8">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
              <span className="text-sm font-semibold">Notifications</span>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {MOCK_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'border-b px-4 py-3 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50',
                    n.unread && 'bg-[#0B3D24]/5',
                  )}
                >
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {userOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
          <div className="absolute right-2 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900 md:right-4 lg:right-8">
            <div className="border-b px-4 py-3 dark:border-gray-700">
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail || 'Super Admin'}</p>
            </div>
            <Link
              href="/settings"
              onClick={() => setUserOpen(false)}
              className="flex min-h-[44px] items-center gap-2 px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/"
              onClick={() => setUserOpen(false)}
              className="flex min-h-[44px] items-center gap-2 px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/pos"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setUserOpen(false)}
              className="flex min-h-[44px] items-center gap-2 px-3 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 md:hidden"
            >
              <Monitor className="h-4 w-4" />
              Open POS
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center gap-2 px-3 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}
    </header>
  );
}
