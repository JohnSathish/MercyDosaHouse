'use client';

import { useEffect, useState } from 'react';
import { PosWorkspace } from '@mdh/pos-ui';
import { api } from '@/lib/api';
import { getStoredUser, userHasRole, type AuthUser } from '@mdh/auth-client';

export default function AdminPosPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#EEF0F3]">
        <p className="text-sm font-medium text-gray-500">Loading POS…</p>
      </div>
    );
  }

  const isManager = user?.isSuperAdmin || userHasRole(user, ['SUPER_ADMIN', 'MANAGER']);

  return (
    <div className="fixed inset-0 z-50">
      <PosWorkspace
        api={api}
        adminBaseUrl=""
        posPath="/pos"
        isManager={isManager}
        cashierName={user?.name ?? undefined}
      />
    </div>
  );
}
