'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AppPromoConfigDto } from '@mdh/types';
import { ANDROID_PLAY_STORE_URL } from '@mdh/utils';
import { api } from '@/lib/api';
import { GooglePlayBadge } from '@/components/google-play-badge';

const KEY = 'mdh_app_promo_popup_v1';

export function AppPromoPopup() {
  const { data } = useQuery({
    queryKey: ['app-promo'],
    queryFn: () => api.get<AppPromoConfigDto>('/settings/app-promo'),
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!data?.enabled || !data.showAsPopup) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(KEY)) return;
    setOpen(true);
  }, [data]);

  if (!open || !data) return null;

  const playUrl = data.playStoreUrl || ANDROID_PLAY_STORE_URL;

  function close() {
    sessionStorage.setItem(KEY, '1');
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-xs font-bold text-[#C17A08]">APP EXCLUSIVE</p>
        <h2 className="text-xl font-bold text-[#14532D] mt-1">{data.title}</h2>
        <p className="text-sm text-gray-600 mt-2">{data.body}</p>
        <p className="text-sm text-gray-500 mt-2">
          Download the Mercy Dosa House App to unlock exclusive offers. This discount is not applied
          on the website.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <GooglePlayBadge href={playUrl} size="md" className="w-full justify-center" />
          <a
            href={playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center rounded-xl bg-[#14532D] text-white font-semibold py-2.5"
            onClick={close}
          >
            {data.ctaLabel || 'Download App'}
          </a>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl border font-semibold py-2.5"
          >
            Continue on web
          </button>
        </div>
      </div>
    </div>
  );
}
