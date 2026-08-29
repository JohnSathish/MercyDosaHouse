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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The public config endpoint can briefly return an older/partial shape while
 * the VPS is being upgraded. Normalize it before any screen renders so one
 * missing optional field cannot take down the whole application.
 */
function normalizeConfig(input: unknown): MobileAppConfigDto {
  const raw = isRecord(input) ? input : {};
  function arrayOrDefault<T>(value: unknown, fallback: T[]): T[] {
    return Array.isArray(value) ? (value.filter(isRecord) as T[]) : fallback;
  }
  const remoteFlags = isRecord(raw.featureFlags)
    ? (Object.fromEntries(
        Object.entries(raw.featureFlags).filter(([, value]) => typeof value === 'boolean'),
      ) as Record<string, boolean>)
    : {};

  return {
    ...DEFAULT_APP_CONFIG,
    ...(raw as Partial<MobileAppConfigDto>),
    branding: {
      ...DEFAULT_APP_CONFIG.branding,
      ...(isRecord(raw.branding) ? raw.branding : {}),
    },
    theme: {
      ...DEFAULT_APP_CONFIG.theme,
      ...(isRecord(raw.theme) ? raw.theme : {}),
    },
    maintenance: {
      ...DEFAULT_APP_CONFIG.maintenance,
      ...(isRecord(raw.maintenance) ? raw.maintenance : {}),
    },
    versionControl: {
      ...DEFAULT_APP_CONFIG.versionControl,
      ...(isRecord(raw.versionControl) ? raw.versionControl : {}),
    },
    store: {
      ...DEFAULT_APP_CONFIG.store,
      ...(isRecord(raw.store) ? raw.store : {}),
    },
    delivery: {
      ...DEFAULT_APP_CONFIG.delivery,
      ...(isRecord(raw.delivery) ? raw.delivery : {}),
    },
    business: {
      ...DEFAULT_APP_CONFIG.business,
      ...(isRecord(raw.business) ? raw.business : {}),
    },
    homepage: arrayOrDefault(raw.homepage, DEFAULT_APP_CONFIG.homepage),
    announcements: arrayOrDefault(raw.announcements, DEFAULT_APP_CONFIG.announcements),
    offers: arrayOrDefault(raw.offers, DEFAULT_APP_CONFIG.offers),
    banners: arrayOrDefault(raw.banners, DEFAULT_APP_CONFIG.banners),
    navigation: arrayOrDefault(raw.navigation, DEFAULT_APP_CONFIG.navigation),
    featureFlags: {
      ...DEFAULT_APP_CONFIG.featureFlags,
      ...remoteFlags,
    },
    paymentMethods: arrayOrDefault(raw.paymentMethods, DEFAULT_APP_CONFIG.paymentMethods),
    help: {
      ...DEFAULT_APP_CONFIG.help,
      ...(isRecord(raw.help) ? raw.help : {}),
    },
  };
}

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

    // Hide native Expo splash immediately so the branded JS splash can paint
    await SplashScreen.hideAsync().catch(() => undefined);

    let nextConfig = DEFAULT_APP_CONFIG;
    const splashStartedAt = Date.now();

    try {
      const store = getConfigStore();
      nextConfig = normalizeConfig(await store.bootstrap());
      setOffline(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load config';
      const cached = getConfigStore().getConfig();
      if (cached) {
        nextConfig = normalizeConfig(cached);
        setOffline(true);
      } else {
        nextConfig = normalizeConfig(DEFAULT_APP_CONFIG);
        setOffline(true);
        setError(message);
      }
    }

    setConfig(nextConfig);
    const href = await resolveInitialHref(nextConfig);
    setInitialHref(href);

    const remaining = 2800 - (Date.now() - splashStartedAt);
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
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
