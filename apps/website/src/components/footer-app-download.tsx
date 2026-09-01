'use client';

import { ANDROID_APP_URL } from '@mdh/utils';
import { GooglePlayBadge } from '@/components/google-play-badge';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { liveAppOnlyDiscountPct } from '@/lib/android-app';

export function FooterAppDownload() {
  const cms = useCmsContent();
  const discountPct = liveAppOnlyDiscountPct(cms?.offers ?? []);

  return (
    <div className="border-b border-white/10">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-white/10 px-5 py-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#F5A000]">
              Get the Mercy Dosa House App
            </h3>
            <p className="mt-2 text-sm text-white/85">Order faster. Get exclusive app offers.</p>
            {discountPct != null ? (
              <p className="mt-2 text-sm font-bold text-[#F5A000]">
                {discountPct}% OFF YOUR FIRST APP ORDER
              </p>
            ) : null}
          </div>
          <GooglePlayBadge href={ANDROID_APP_URL} size="md" />
        </div>
      </div>
    </div>
  );
}
