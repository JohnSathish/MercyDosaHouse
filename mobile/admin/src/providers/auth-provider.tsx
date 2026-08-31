import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@mdh/types';
import { getRememberDevice, getStoredUser, clearAuth, setRememberDevice } from '@/lib/auth-storage';
import { subscribeSessionInvalidated } from '@/lib/auth-events';
import {
  loginWithEmail,
  logout as apiLogout,
  refreshTokens,
  sendOtp,
  verifyOtp,
} from '@/lib/auth-api';
import { isStaffUser } from '@/lib/roles';

const BOOTSTRAP_TIMEOUT_MS = 8000;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginOtp: (phone: string, otp: string, remember?: boolean) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Startup timed out. Check your connection.')),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await withTimeout(
        (async () => {
          const remember = await getRememberDevice();
          if (!remember) {
            await clearAuth();
            setUser(null);
            return;
          }

          const stored = await getStoredUser();
          if (!stored || !isStaffUser(stored)) {
            if (stored) await clearAuth();
            setUser(null);
            return;
          }

          setUser(stored);
        })(),
        BOOTSTRAP_TIMEOUT_MS,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore session');
    } finally {
      setLoading(false);
    }

    void refreshTokens()
      .then(async (tokens) => {
        if (tokens) {
          const again = await getStoredUser();
          if (again && isStaffUser(again)) setUser(again);
          return;
        }
        const still = await getStoredUser();
        if (!still) setUser(null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return subscribeSessionInvalidated(() => {
      setUser(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login: async (email, password, remember) => {
        await setRememberDevice(remember);
        const res = await loginWithEmail(email, password);
        setUser(res.user);
        setError(null);
      },
      requestOtp: async (phone) => {
        await sendOtp(phone);
      },
      loginOtp: async (phone, otp, remember = true) => {
        await setRememberDevice(remember);
        const res = await verifyOtp(phone, otp);
        setUser(res.user);
        setError(null);
      },
      logout: async () => {
        await apiLogout();
        setUser(null);
      },
      refreshUser: async () => {
        const u = await getStoredUser();
        setUser(u && isStaffUser(u) ? u : null);
      },
      retry: bootstrap,
    }),
    [user, loading, error, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
