'use client';

import { useQuery } from '@tanstack/react-query';
import type { AppPromoConfigDto } from '@mdh/types';
import { api } from '@/lib/api';

export function AppPromoBanner({ placement }: { placement: 'site' | 'menu' | 'checkout' }) {
  const { data } = useQuery({
    queryKey: ['app-promo'],
    queryFn: () => api.get<AppPromoConfigDto>('/settings/app-promo'),
    staleTime: 60_000,
  });
  if (!data?.enabled) return null;
  if (placement === 'site' && !data.showOnWebsite) return null;
  if (placement === 'menu' && !data.showOnMenu) return null;
  if (placement === 'checkout' && !data.showOnCheckout) return null;

  return (
    <div className="rounded-xl border border-[#14532D]/20 bg-[#14532D] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-[#FDE68A]">📱 APP EXCLUSIVE</p>
        <p className="font-semibold mt-0.5">{data.title}</p>
        <p className="text-sm text-white/80 mt-0.5">{data.body}</p>
      </div>
      {data.playStoreUrl ? (
        <a
          href={data.playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full bg-[#F59E0B] text-[#14532D] font-bold text-sm px-4 py-2"
        >
          {data.ctaLabel || 'Download App'}
        </a>
      ) : null}
    </div>
  );
}
