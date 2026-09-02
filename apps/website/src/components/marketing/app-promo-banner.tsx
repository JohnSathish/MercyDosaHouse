'use client';

import { useQuery } from '@tanstack/react-query';
import type { AppPromoConfigDto } from '@mdh/types';
import { ANDROID_APP_URL } from '@mdh/utils';
import { api } from '@/lib/api';
import { GooglePlayBadge } from '@/components/google-play-badge';

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
    <div className="rounded-xl border border-[#14532D]/20 bg-[#14532D] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 min-w-0 w-full">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-[#FDE68A]">📱 APP EXCLUSIVE</p>
        <p className="font-semibold mt-0.5">{data.title}</p>
        <p className="text-sm text-white/80 mt-0.5">{data.body}</p>
      </div>
      <GooglePlayBadge href={ANDROID_APP_URL} size="md" className="max-w-full" />
    </div>
  );
}
