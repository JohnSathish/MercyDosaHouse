'use client';

import { useEffect, useState } from 'react';
import type { RestaurantStatusDto } from '@mdh/types';
import type { PosApiClient } from './pos-workspace';

export function PosRestaurantClosedBanner({ api }: { api: PosApiClient }) {
  const [status, setStatus] = useState<RestaurantStatusDto | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void api
        .get<RestaurantStatusDto>('/settings/restaurant-status')
        .then((data) => {
          if (active) setStatus(data);
        })
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [api]);

  if (!status || status.storeOpen) return null;

  return (
    <div className="bg-red-700 text-white px-4 py-2 text-center text-sm font-bold tracking-wide shrink-0">
      🔴 RESTAURANT CLOSED — Online orders blocked. In-store POS &amp; existing orders still
      available.
      {status.storeClosedReason ? (
        <span className="block font-normal text-red-100 text-xs mt-0.5">
          Reason: {status.storeClosedReason}
        </span>
      ) : null}
    </div>
  );
}
