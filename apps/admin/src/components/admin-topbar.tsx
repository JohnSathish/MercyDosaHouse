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
} from 'lucide-react';
import { Button, cn } from '@mdh/ui';
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
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  brand: AdminBrand;
  brandLoading?: boolean;
  onOpenMobileNav: () => void;
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
  themeMode,
  onThemeChange,
  brand,
  brandLoading,
  onOpenMobileNav,
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

  const searchResults = searchQuery.trim()
    ? ADMIN_NAV.filter((item) =>
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
    <header className="sticky top-0 z-30 w-full max-w-[100vw] shrink-0 border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-900/80 dark:border-gray-800">
      {/* Mobile header row */}
      <div className="flex md:hidden items-center gap-2 px-3 h-14 min-h-[56px]">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 text-[#14532D]" />
        </button>

        <AdminMobileBrand brand={brand} brandLoading={brandLoading} />

        <div className="flex-1 min-w-0 px-1">
          <p className="text-sm font-bold text-[#14532D] dark:text-emerald-400 truncate leading-tight">
            {pageTitle}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{brand.businessName}</p>
        </div>

        <button
          type="button"
          onClick={() => setMobileSearchOpen((o) => !o)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Search modules"
        >
          <Search className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setUserOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="User menu"
          >
            <div className="h-8 w-8 rounded-full bg-[#14532D] flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile expandable search */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-3 border-b dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-10 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30 dark:text-white"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg"
              aria-label="Close search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          {searchQuery && searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-700 py-1 max-h-48 overflow-y-auto">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSearch}
                    className="flex items-center gap-2 px-3 py-3 min-h-[44px] text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Icon className="h-4 w-4 text-[#14532D]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Desktop header row */}
      <div className="hidden md:flex items-center gap-3 px-4 lg:px-6 xl:px-8 h-14">
        <div className="relative flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search modules…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30 dark:text-white"
            />
          </div>
          {searchOpen && searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSearch}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Icon className="h-4 w-4 text-[#14532D]" />
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
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shrink-0"
          title={`Open POS terminal (${APP_URLS.pos})`}
        >
          <Monitor className="h-4 w-4" />
          Return to POS
        </Link>

        <div className="relative hidden sm:block">
          <Button
            size="sm"
            className="bg-[#14532D] hover:bg-[#14532D]/90 text-white gap-1.5 h-9"
            onClick={() => setQuickOpen((o) => !o)}
          >
            <Plus className="h-4 w-4" />
            Quick Action
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
          {quickOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setQuickOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setQuickOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Icon className="h-4 w-4 text-[#14532D]" />
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
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Change theme"
          >
            <ThemeIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          {themeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onThemeChange(mode);
                      setThemeOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[44px]',
                      themeMode === mode && 'bg-[#14532D]/10 text-[#14532D] font-medium',
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

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg pl-2 pr-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
          >
            <div className="h-8 w-8 rounded-full bg-[#14532D] flex items-center justify-center text-white text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden lg:block" />
          </button>
        </div>
      </div>

      {/* Shared dropdowns (mobile + desktop) */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-2 md:right-4 lg:right-8 top-full mt-1 w-[min(calc(100vw-1rem),20rem)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border dark:border-gray-700 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
              <span className="font-semibold text-sm">Notifications</span>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px]"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {MOCK_NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    n.unread && 'bg-[#14532D]/5',
                  )}
                >
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {userOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
          <div className="absolute right-2 md:right-4 lg:right-8 top-full mt-1 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
            <div className="px-3 py-2 border-b dark:border-gray-700">
              <p className="text-sm font-semibold truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">Super Admin</p>
            </div>
            <Link
              href="/settings"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-2 px-3 py-3 min-h-[44px] text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link
              href="/"
              onClick={() => setUserOpen(false)}
              className="flex items-center gap-2 px-3 py-3 min-h-[44px] text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/pos"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setUserOpen(false)}
              className="flex md:hidden items-center gap-2 px-3 py-3 min-h-[44px] text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Monitor className="h-4 w-4" />
              Open POS
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-3 min-h-[44px] text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
