import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@mdh/types';
import { getStoredUser } from '@/lib/auth-storage';
import { ensureSession, logout as apiLogout } from '@/lib/auth-api';
import {
  SESSION_EXPIRED_MESSAGE,
  subscribeAuthChanged,
  subscribeSessionInvalidated,
} from '@/lib/auth-events';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  sessionMessage: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const loadStored = useCallback(async () => {
    const stored = await getStoredUser();
    setUser(stored);
    return stored;
  }, []);

  const restore = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await loadStored();
      const next = await ensureSession();
      setUser(next);
      if (stored && !next) {
        setSessionMessage(SESSION_EXPIRED_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  }, [loadStored]);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ensureSession().then((next) => setUser(next));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return subscribeAuthChanged(() => {
      void getStoredUser().then((next) => {
        setUser((prev) => {
          if (!prev?.id && next?.id) {
            void queryClient.invalidateQueries();
          }
          return next;
        });
        if (next) setSessionMessage(null);
      });
    });
  }, [queryClient]);

  useEffect(() => {
    return subscribeSessionInvalidated(() => {
      setUser(null);
      setSessionMessage(SESSION_EXPIRED_MESSAGE);
      Alert.alert('Session expired', SESSION_EXPIRED_MESSAGE);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sessionMessage,
      refreshUser: async () => {
        await loadStored();
      },
      logout: async () => {
        await apiLogout();
        setUser(null);
        setSessionMessage(null);
        queryClient.clear();
      },
    }),
    [user, loading, sessionMessage, loadStored, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
