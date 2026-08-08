'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import type { BusinessSettingsDto, ThemeSettingsDto } from '@mdh/types';

export interface AdminBrand {
  businessName: string;
  tagline: string;
  logoUrl: string;
  version: string;
  isOnline: boolean;
}

function resolveAssetUrl(url?: string | null): string {
  const fallback = `${APP_URLS.website}/images/logo.png`;
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${APP_URLS.website}${url.startsWith('/') ? url : `/${url}`}`;
}

export function useAdminBrand(): { brand: AdminBrand; isLoading: boolean } {
  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['admin-business-settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: theme, isLoading: loadingTheme } = useQuery({
    queryKey: ['admin-theme-settings'],
    queryFn: () => api.get<ThemeSettingsDto>('/cms/theme'),
    staleTime: 5 * 60 * 1000,
  });

  return {
    brand: {
      businessName: business?.businessName || 'Mercy Dosa House',
      tagline: business?.tagline || 'Restaurant ERP',
      logoUrl: resolveAssetUrl(theme?.logoUrl),
      version: 'v1.0',
      isOnline: true,
    },
    isLoading: loadingBusiness || loadingTheme,
  };
}
