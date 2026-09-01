'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import type { AppPromoConfigDto } from '@mdh/types';
import { ANDROID_APP_URL } from '@mdh/utils';
import { api } from '@/lib/api';
import { GooglePlayBadge } from '@/components/google-play-badge';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import { liveAppOnlyDiscountPct } from '@/lib/android-app';

function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.8rem] border-[6px] border-[#18352A] bg-black shadow-2xl ${className ?? ''}`}
    >
      <div className="relative aspect-[9/19]">
        <Image src={src} alt={alt} fill sizes="180px" className="object-cover" />
      </div>
    </div>
  );
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
  const playHref = ANDROID_APP_URL;
  const appAnnouncement =
    marketing?.announcements?.find((item) =>
      `${item.ctaUrl ?? ''} ${item.linkUrl ?? ''}`.toLowerCase().includes('play.google'),
    ) ?? null;

  function onPlayClick() {
    if (!appAnnouncement?.id) return;
    void trackMarketingEvent(appAnnouncement.id, 'cta_click', { surface: 'homepage_app_band' });
  }

  return (
    <section className="bg-[#0B542F] py-12 text-white md:py-16">
      <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto flex h-[280px] w-full max-w-sm items-end justify-center">
          <div className="absolute left-6 top-6 w-[42%] -rotate-6">
            <PhoneFrame src="/images/hero-dosa.png" alt="Mercy Dosa House app menu" />
          </div>
          <div className="relative z-10 w-[48%] rotate-3">
            <PhoneFrame src="/images/chicken-biryani.png" alt="Mercy Dosa House app order screen" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase leading-tight md:text-4xl">
            Order faster.
            <br />
            Get exclusive offers.
          </h2>
          <p className="mt-4 max-w-lg text-white/85">
            Download the Mercy Dosa House App and enjoy app-exclusive offers.
          </p>
          {discountPct != null ? (
            <div className="mt-6 inline-flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#F5A000] text-center text-[#18352A] shadow-lg">
              <span className="text-2xl font-black leading-none">{discountPct}% OFF</span>
              <span className="mt-1 px-2 text-[10px] font-bold uppercase leading-tight">
                On your first app order
              </span>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={playHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onPlayClick}
              className="inline-flex min-h-12 items-center rounded-full bg-[#F5A000] px-8 text-sm font-black uppercase tracking-wide text-[#18352A]"
            >
              Download App
            </a>
            <GooglePlayBadge href={playHref} size="md" onClick={onPlayClick} />
          </div>
        </div>
      </div>
    </section>
  );
}
