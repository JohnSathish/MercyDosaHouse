import { BRAND } from '@/lib/constants';

export const COLORS = {
  primary: BRAND.primary,
  primaryDark: '#0F3D22',
  secondary: BRAND.secondary,
  background: '#FFF6E8',
  surface: '#FFFFFF',
  text: BRAND.text,
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E8E0D4',
  success: '#059669',
  danger: '#B91C1C',
  cream: '#FFF8E8',
  amberSoft: '#FEF3C7',
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 22,
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
    shadowColor: '#14532D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  float: {
    shadowColor: '#14532D',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
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
