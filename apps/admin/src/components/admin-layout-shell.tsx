'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminShell } from '@mdh/ui';
import { getStoredUser, isAuthenticated, logout } from '@mdh/auth-client';
import { ADMIN_NAV, API_URL } from '@/lib/api';

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoginPage && !isAuthenticated()) {
      router.push('/login');
      return;
    }
    const user = getStoredUser();
    if (user) setUserName(user.name || user.email || 'Admin');
  }, [isLoginPage, router, pathname]);

  if (isLoginPage) return <>{children}</>;

  return (
    <AdminShell
      title="Admin"
      navItems={ADMIN_NAV}
      userName={userName}
      onLogout={async () => {
        await logout(API_URL);
        router.push('/login');
      }}
    >
      {children}
    </AdminShell>
  );
}
