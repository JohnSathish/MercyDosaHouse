'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getStoredUser,
  isAuthenticated,
  isAdminUser,
  getPostLoginRedirect,
} from '@mdh/auth-client';
import { APP_URLS } from '@/lib/app-urls';
import { useAdminBrand } from '@/lib/use-admin-brand';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminTopbar } from '@/components/admin-topbar';

export type ThemeMode = 'light' | 'dark' | 'system';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const isLoginPage = pathname === '/login';

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

  useEffect(() => {
    if (isLoginPage) return;

    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getStoredUser();
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isAdminUser(user)) {
      const redirect = getPostLoginRedirect(user, APP_URLS);
      window.location.href = redirect;
      return;
    }

    setUserName(user.name || user.email || 'Admin');
  }, [isLoginPage, router, pathname]);

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

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="min-h-screen w-full flex bg-gray-50 dark:bg-gray-950">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        brand={brand}
        brandLoading={brandLoading}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <AdminTopbar
          userName={userName}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
          brand={brand}
          brandLoading={brandLoading}
        />
        <main className="flex-1 w-full p-4 lg:p-6 xl:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
