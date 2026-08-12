import { BRAND } from '@/lib/constants';

export const COLORS = {
  primary: BRAND.primary,
  secondary: BRAND.secondary,
  background: BRAND.background,
  surface: '#FFFFFF',
  text: BRAND.text,
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  success: '#059669',
  danger: '#B91C1C',
  cream: '#FFF8E8',
  amberSoft: '#FEF3C7',
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export function resolveAssetUrl(
  url: string | null | undefined,
  websiteUrl: string,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = websiteUrl.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}
