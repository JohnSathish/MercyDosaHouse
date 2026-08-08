'use client';

import { createContext, useContext } from 'react';
import type { PublishedSiteContentDto } from '@mdh/types';

const CmsContext = createContext<PublishedSiteContentDto | null>(null);

export function CmsContentProvider({
  content,
  children,
}: {
  content: PublishedSiteContentDto;
  children: React.ReactNode;
}) {
  return <CmsContext.Provider value={content}>{children}</CmsContext.Provider>;
}

export function useCmsContent() {
  return useContext(CmsContext);
}
