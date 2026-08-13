'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { MarketingPublicBundleDto } from '@mdh/types';
import { api } from '@/lib/api';

const MarketingContext = createContext<MarketingPublicBundleDto | null>(null);

const EMPTY: MarketingPublicBundleDto = {
  version: 0,
  updatedAt: new Date().toISOString(),
  announcements: [],
  byPlacement: {},
  delivery: null,
};

export function MarketingProvider({
  bundle,
  children,
}: {
  bundle: MarketingPublicBundleDto;
  children: React.ReactNode;
}) {
  const [live, setLive] = useState<MarketingPublicBundleDto>(bundle ?? EMPTY);

  useEffect(() => {
    setLive(bundle ?? EMPTY);
  }, [bundle]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const data = await api.get<MarketingPublicBundleDto>('/marketing/public?platform=WEBSITE');
        if (!cancelled) setLive(data);
      } catch {
        /* keep SSR / last known bundle */
      }
    };
    void refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return <MarketingContext.Provider value={live}>{children}</MarketingContext.Provider>;
}

export function useMarketing() {
  return useContext(MarketingContext);
}
