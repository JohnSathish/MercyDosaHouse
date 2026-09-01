'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ensureAuthenticated,
  getPostLoginRedirect,
  isAdminUser,
  onAuthCleared,
} from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useAdminBrand } from '@/lib/use-admin-brand';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminTopbar } from '@/components/admin-topbar';
import { InboxRealtime } from '@/components/inbox-realtime';
import { AdminMobileDrawer } from '@/components/admin-mobile-drawer';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';

export type ThemeMode = 'light' | 'dark' | 'system';

type AuthStatus = 'checking' | 'allowed' | 'denied';

const THEME_KEY = 'mdh-admin-theme';
const SIDEBAR_KEY = 'mdh-admin-sidebar-collapsed';

function resolveTheme(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveTheme(mode));
}

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { brand, isLoading: brandLoading } = useAdminBrand();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const isLoginPage = pathname === '/login';
  const isPublicPage = isLoginPage;

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const mode: ThemeMode =
      storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system'
        ? storedTheme
        : 'system';
    setThemeMode(mode);
    applyTheme(mode);

    const storedSidebar = localStorage.getItem(SIDEBAR_KEY);
    if (storedSidebar === 'true') setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  /* Close mobile drawer when route changes */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  /* Prevent body scroll when mobile drawer is open */
  useEffect(() => {
    if (isPublicPage) return;
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen, isPublicPage]);

  const verifyAccess = useCallback(async () => {
    if (isPublicPage) {
      setAuthStatus('allowed');
      return;
    }

    setAuthStatus('checking');
    const user = await ensureAuthenticated(API_URL);

    if (!user) {
      setAuthStatus('denied');
      const next = pathname && pathname !== '/login' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
      return;
    }

    if (!isAdminUser(user)) {
      setAuthStatus('denied');
      window.location.href = getPostLoginRedirect(user, APP_URLS);
      return;
    }

    setUserName(user.name || user.email || 'Admin');
    setUserEmail(user.email || '');
    setAuthStatus('allowed');
  }, [isPublicPage, router]);

  useEffect(() => {
    void verifyAccess();
  }, [verifyAccess, pathname]);

  useEffect(() => {
    if (isPublicPage) return;
    return onAuthCleared(() => {
      setAuthStatus('denied');
      router.replace('/login');
    });
  }, [isPublicPage, router]);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  };

  if (isPublicPage) return <>{children}</>;

  if (authStatus === 'checking') {
    return (
      <div className="flex h-dvh max-h-dvh w-full overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div className="hidden md:block w-64 shrink-0 border-r bg-white dark:bg-gray-900 animate-pulse" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="h-14 shrink-0 border-b bg-white dark:bg-gray-900 animate-pulse" />
          <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    );
  }

  if (authStatus === 'denied') return null;

  return (
    <div className="flex h-dvh max-h-dvh w-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      <InboxRealtime />
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        brand={brand}
        brandLoading={brandLoading}
        userName={userName}
        userEmail={userEmail}
      />

      <AdminMobileDrawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        brand={brand}
        brandLoading={brandLoading}
      />

      <div className="flex min-h-0 min-w-0 w-full max-w-[100vw] flex-1 flex-col">
        <AdminTopbar
          userName={userName}
          userEmail={userEmail}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          brand={brand}
          brandLoading={brandLoading}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onToggleSidebar={toggleSidebar}
        />
        <main className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
