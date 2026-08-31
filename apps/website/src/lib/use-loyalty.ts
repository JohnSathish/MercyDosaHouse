'use client';

import { useQuery } from '@tanstack/react-query';
import { isAuthenticated } from '@mdh/auth-client';
import { api } from '@/lib/api';
import type { LoyaltyMeDto, LoyaltyPublicConfigDto } from '@mdh/types';

export function useLoyaltyMe(enabled = true) {
  const authed = typeof window !== 'undefined' && isAuthenticated();
  return useQuery({
    queryKey: ['loyalty-me'],
    queryFn: () => api.get<LoyaltyMeDto>('/loyalty/me'),
    enabled: enabled && authed,
    staleTime: 30_000,
  });
}

export function useLoyaltyPublicConfig() {
  return useQuery({
    queryKey: ['loyalty-config'],
    queryFn: () => api.get<LoyaltyPublicConfigDto>('/loyalty/config'),
    staleTime: 60_000,
  });
}
