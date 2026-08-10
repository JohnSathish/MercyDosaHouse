'use client';

import { createContext, useContext } from 'react';
import type { MarketingPublicBundleDto } from '@mdh/types';

const MarketingContext = createContext<MarketingPublicBundleDto | null>(null);

export function MarketingProvider({
  bundle,
  children,
}: {
  bundle: MarketingPublicBundleDto;
  children: React.ReactNode;
}) {
  return <MarketingContext.Provider value={bundle}>{children}</MarketingContext.Provider>;
}

export function useMarketing() {
  return useContext(MarketingContext);
}
