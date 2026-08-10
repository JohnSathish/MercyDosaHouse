import type { MobileAppConfigDto } from '@mdh/types';
import { createContext, useContext, useMemo } from 'react';
import type { MobileConfigStore } from '@mdh/mobile-shared';

interface ConfigContextValue {
  config: MobileAppConfigDto;
  store: MobileConfigStore;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({
  config,
  store,
  children,
}: {
  config: MobileAppConfigDto;
  store: MobileConfigStore;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ config, store }), [config, store]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useAppConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useAppConfig must be used within ConfigProvider');
  return ctx.config;
}

export function useConfigStore() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigStore must be used within ConfigProvider');
  return ctx.store;
}

export function useFeatureFlag(key: string): boolean {
  const config = useAppConfig();
  return config.featureFlags[key] ?? false;
}

export function useThemeColors() {
  const config = useAppConfig();
  return {
    primary: config.theme.primaryColor,
    secondary: config.theme.secondaryColor,
    background: config.branding.splashBackgroundColor,
  };
}
