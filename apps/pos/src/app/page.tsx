'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PosWorkspace } from '@mdh/pos-ui';
import { getStoredUser, isAuthenticated, userHasRole, STAFF_ROLES } from '@mdh/auth-client';
import { api, API_URL } from '@/lib/api';

export default function PosTerminalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const u = getStoredUser();
    if (!u || !userHasRole(u, STAFF_ROLES)) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        Loading POS…
      </div>
    );
  }

  const isManager = user?.isSuperAdmin || userHasRole(user, ['SUPER_ADMIN', 'MANAGER']);

  const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

  return (
    <PosWorkspace
      api={api}
      apiBaseUrl={API_URL}
      adminBaseUrl={ADMIN_URL}
      posPath="/"
      isManager={isManager}
      cashierName={user?.name ?? undefined}
      userEmail={user?.email ?? undefined}
      onLogout={() => router.replace('/login')}
    />
  );
}
