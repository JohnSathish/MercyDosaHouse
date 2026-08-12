import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@mdh/types';
import { getRememberDevice, getStoredUser, clearAuth, setRememberDevice } from '@/lib/auth-storage';
import {
  loginWithEmail,
  logout as apiLogout,
  refreshTokens,
  sendOtp,
  verifyOtp,
} from '@/lib/auth-api';
import { isStaffUser } from '@/lib/roles';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginOtp: (phone: string, otp: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const remember = await getRememberDevice();
      const stored = await getStoredUser();
      if (!remember) {
        await clearAuth();
        setUser(null);
        return;
      }
      if (stored && isStaffUser(stored)) {
        setUser(stored);
        await refreshTokens().catch(() => undefined);
        const again = await getStoredUser();
        if (again && isStaffUser(again)) setUser(again);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password, remember) => {
        await setRememberDevice(remember);
        const res = await loginWithEmail(email, password);
        setUser(res.user);
      },
      requestOtp: async (phone) => {
        await sendOtp(phone);
      },
      loginOtp: async (phone, otp) => {
        const res = await verifyOtp(phone, otp);
        setUser(res.user);
      },
      logout: async () => {
        await apiLogout();
        setUser(null);
      },
      refreshUser: async () => {
        const u = await getStoredUser();
        setUser(u && isStaffUser(u) ? u : null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
