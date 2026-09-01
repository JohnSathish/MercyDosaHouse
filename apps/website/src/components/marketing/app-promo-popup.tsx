'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AppPromoConfigDto } from '@mdh/types';
import { X } from 'lucide-react';
import { FaGooglePlay } from 'react-icons/fa';
import { ANDROID_APP_URL } from '@mdh/utils';
import { api } from '@/lib/api';

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

  const playUrl = ANDROID_APP_URL;

  function close() {
    sessionStorage.setItem(KEY, '1');
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-5 pt-12 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-[#14532D] transition hover:bg-[#14532D]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A000]"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <p className="text-xs font-bold text-[#C17A08]">APP EXCLUSIVE</p>
        <h2 id="app-promo-title" className="mt-1 text-xl font-bold text-[#14532D]">
          {data.title}
        </h2>
        <p className="text-sm text-gray-600 mt-2">{data.body}</p>
        <p className="text-sm text-gray-500 mt-2">
          Download the Mercy Dosa House App to unlock exclusive offers. This discount is not applied
          on the website.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <a
            href={playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] py-3 text-center font-semibold text-white"
            onClick={close}
          >
            <FaGooglePlay className="h-5 w-5 shrink-0" aria-hidden />
            Download Now
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
