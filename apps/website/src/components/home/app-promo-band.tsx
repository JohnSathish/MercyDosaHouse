'use client';

import { useQuery } from '@tanstack/react-query';
import type { AppPromoConfigDto, OfferDto } from '@mdh/types';
import { ANDROID_PLAY_STORE_URL } from '@mdh/utils';
import { api } from '@/lib/api';
import { GooglePlayBadge } from '@/components/google-play-badge';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';

function liveAppOnlyDiscountPct(offers: OfferDto[]): number | null {
  const now = Date.now();
  for (const offer of offers) {
    if (!offer.isActive) continue;
    if (offer.startsAt && new Date(offer.startsAt).getTime() > now) continue;
    if (offer.endsAt && new Date(offer.endsAt).getTime() < now) continue;
    const blob =
      `${offer.type} ${offer.title} ${offer.displayPosition ?? ''} ${offer.buttonUrl ?? ''} ${offer.description ?? ''}`.toLowerCase();
    const isAppOnly =
      blob.includes('android') ||
      blob.includes('app-only') ||
      blob.includes('app only') ||
      offer.type.toUpperCase() === 'APP' ||
      offer.type.toUpperCase() === 'ANDROID';
    if (isAppOnly && offer.discountPct != null && offer.discountPct > 0) {
      return offer.discountPct;
    }
  }
  return null;
}

export function AppPromoBand() {
  const cms = useCmsContent();
  const marketing = useMarketing();
  const { data } = useQuery({
    queryKey: ['app-promo'],
    queryFn: () => api.get<AppPromoConfigDto>('/settings/app-promo'),
    staleTime: 60_000,
  });

  if (!data?.enabled || !data.showOnWebsite) return null;

  const discountPct = liveAppOnlyDiscountPct(cms?.offers ?? []);
  const playHref = data.playStoreUrl || ANDROID_PLAY_STORE_URL;
  const appAnnouncement =
    marketing?.announcements?.find((item) =>
      `${item.ctaUrl ?? ''} ${item.linkUrl ?? ''}`.toLowerCase().includes('play.google'),
    ) ?? null;

  function onPlayClick() {
    if (!appAnnouncement?.id) return;
    void trackMarketingEvent(appAnnouncement.id, 'cta_click', { surface: 'homepage_app_band' });
  }

  return (
    <section className="bg-[#14532D] py-10 md:py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDE68A]">
              Get the app
              {discountPct != null ? ` · ${discountPct}% OFF` : ''}
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">{data.title}</h2>
            <p className="mt-2 text-sm text-white/80 md:text-base">{data.body}</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <GooglePlayBadge href={playHref} size="md" onClick={onPlayClick} />
            <span className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/85">
              Coming soon on iOS
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
