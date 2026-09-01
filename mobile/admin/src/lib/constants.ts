const PRODUCTION_API_URL = 'https://mercydosahouse.com/api/v1';
const PRODUCTION_WEBSITE_URL = 'https://mercydosahouse.com';

export function resolveApiBase(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim() || PRODUCTION_API_URL;
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

export function resolveWebsiteUrl(): string {
  return process.env.EXPO_PUBLIC_WEBSITE_URL?.trim() || PRODUCTION_WEBSITE_URL;
}

export const API_URL = resolveApiBase();
export const SOCKET_URL = API_URL.replace(/\/api\/v1$/, '');
export const WEBSITE_URL = resolveWebsiteUrl();
export const APP_VERSION = '1.0.8';

export const BRAND = {
  primary: '#14532D',
  primaryDark: '#0c3d24',
  secondary: '#F59E0B',
  background: '#F5F7F6',
  surface: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  danger: '#DC2626',
  success: '#16A34A',
  border: '#E5E7EB',
};

export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'MANAGER',
  'KITCHEN_STAFF',
  'DELIVERY_STAFF',
  'CASHIER',
] as const;

export const ADMIN_ROLES = ['SUPER_ADMIN', 'MANAGER', 'CASHIER'] as const;
