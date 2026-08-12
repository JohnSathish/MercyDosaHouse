import { shouldForceUpdate } from '@mdh/mobile-shared';
import type { MobileAppConfigDto } from '@mdh/types';
import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from '@/lib/constants';
import { DEFAULT_APP_CONFIG } from '@/lib/default-app-config';
import { getConfigStore } from '@/lib/config-store';
import { ConfigProvider } from '@/providers/config-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type BootstrapPhase = 'loading' | 'ready';

interface BootstrapContextValue {
  phase: BootstrapPhase;
  config: MobileAppConfigDto;
  offline: boolean;
  error: string | null;
  /** Resolved after bootstrap — used by app/index.tsx */
  initialHref: string | null;
  retry: () => Promise<void>;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

/** Guests land on Home; login is only required at checkout. */
async function resolveInitialHref(config: MobileAppConfigDto): Promise<string> {
  if (config.maintenance.maintenanceMode) return '/maintenance';
  if (shouldForceUpdate(APP_VERSION, config)) return '/force-update';
  return '/(tabs)';
}

export function BootstrapProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<BootstrapPhase>('loading');
  const [config, setConfig] = useState<MobileAppConfigDto>(DEFAULT_APP_CONFIG);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialHref, setInitialHref] = useState<string | null>(null);

  const runBootstrap = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setInitialHref(null);

    let nextConfig = DEFAULT_APP_CONFIG;

    try {
      const store = getConfigStore();
      nextConfig = await store.bootstrap();
      setOffline(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load config';
      const cached = getConfigStore().getConfig();
      if (cached) {
        nextConfig = cached;
        setOffline(true);
      } else {
        nextConfig = DEFAULT_APP_CONFIG;
        setOffline(true);
        setError(message);
      }
    }

    setConfig(nextConfig);
    const href = await resolveInitialHref(nextConfig);
    setInitialHref(href);
    await SplashScreen.hideAsync();
    setPhase('ready');
  }, []);

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  const value = useMemo(
    () => ({
      phase,
      config,
      offline,
      error,
      initialHref,
      retry: runBootstrap,
    }),
    [phase, config, offline, error, initialHref, runBootstrap],
  );

  return (
    <BootstrapContext.Provider value={value}>
      <ConfigProvider config={config} store={getConfigStore()}>
        {children}
      </ConfigProvider>
    </BootstrapContext.Provider>
  );
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) throw new Error('useBootstrap must be used within BootstrapProvider');
  return ctx;
}
