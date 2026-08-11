'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_STORE_CLOSED_CUSTOMER_BODY,
  DEFAULT_STORE_CLOSED_CUSTOMER_HEADLINE,
  DEFAULT_STORE_CLOSED_MESSAGE,
  type RestaurantStatusDto,
} from '@mdh/types';
import { api } from '@/lib/api';

interface RestaurantStatusContextValue {
  status: RestaurantStatusDto | undefined;
  isOpen: boolean;
  isLoading: boolean;
  headline: string;
  body: string;
  reopenHint: string | null;
  orderBlockedMessage: string;
}

const RestaurantStatusContext = createContext<RestaurantStatusContextValue | null>(null);

export function RestaurantStatusProvider({ children }: { children: React.ReactNode }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['restaurant-status'],
    queryFn: () => api.get<RestaurantStatusDto>('/settings/restaurant-status'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const value = useMemo((): RestaurantStatusContextValue => {
    const isOpen = status?.storeOpen !== false;
    return {
      status,
      isOpen,
      isLoading,
      headline: DEFAULT_STORE_CLOSED_CUSTOMER_HEADLINE,
      body: status?.storeClosedMessage?.trim() || DEFAULT_STORE_CLOSED_CUSTOMER_BODY,
      reopenHint: status?.storeReopenMessage?.trim() || null,
      orderBlockedMessage: status?.storeClosedMessage?.trim() || DEFAULT_STORE_CLOSED_MESSAGE,
    };
  }, [status, isLoading]);

  return (
    <RestaurantStatusContext.Provider value={value}>{children}</RestaurantStatusContext.Provider>
  );
}

export function useRestaurantStatus() {
  const ctx = useContext(RestaurantStatusContext);
  if (!ctx) throw new Error('useRestaurantStatus must be used within RestaurantStatusProvider');
  return ctx;
}
