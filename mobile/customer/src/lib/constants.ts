import type { MobileAppConfigDto } from '@mdh/types';

const PRODUCTION_API_URL = 'https://mercydosahouse.com/api/v1';
const PRODUCTION_WEBSITE_URL = 'https://mercydosahouse.com';

/** Resolve API base URL — production default, overridable via EXPO_PUBLIC_API_URL at build time. */
export function resolveApiBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim() || PRODUCTION_API_URL;
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

/** Public website URL for deep links and assets. */
export function resolveWebsiteUrl(): string {
  return process.env.EXPO_PUBLIC_WEBSITE_URL?.trim() || PRODUCTION_WEBSITE_URL;
}

/** NestJS API base including `/api/v1` prefix */
export const API_URL = resolveApiBase();

/** Socket.IO base (no /api/v1) */
export const SOCKET_URL = API_URL.replace(/\/api\/v1$/, '');

export const WEBSITE_URL = resolveWebsiteUrl();

export const APP_VERSION = '1.0.5';

export const BRAND = {
  primary: '#14532D',
  secondary: '#F59E0B',
  background: '#FFF7E6',
  text: '#1F2937',
} as const;

export function mergeAppConfig(
  partial: Partial<MobileAppConfigDto>,
  base: MobileAppConfigDto,
): MobileAppConfigDto {
  return {
    ...base,
    ...partial,
    branding: { ...base.branding, ...partial.branding },
    theme: { ...base.theme, ...partial.theme },
    maintenance: { ...base.maintenance, ...partial.maintenance },
    versionControl: { ...base.versionControl, ...partial.versionControl },
    store: { ...base.store, ...partial.store },
    delivery: { ...base.delivery, ...partial.delivery },
    business: { ...base.business, ...partial.business },
    help: { ...base.help, ...partial.help },
    featureFlags: { ...base.featureFlags, ...partial.featureFlags },
  };
}
