'use client';

import { AlertTriangle } from 'lucide-react';
import { useRestaurantStatus } from '@/lib/restaurant-status-context';

export function RestaurantClosedBanner() {
  const { isOpen, isLoading, headline, body, reopenHint } = useRestaurantStatus();

  if (isLoading || isOpen) return null;

  return (
    <div
      role="alert"
      className="bg-red-700 text-white px-4 py-3 text-center text-sm shadow-md border-b border-red-800"
    >
      <div className="flex items-center justify-center gap-2 font-bold text-base">
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
        <span>🔴 {headline}</span>
      </div>
      <p className="mt-1 opacity-95 max-w-2xl mx-auto">{body}</p>
      {reopenHint ? <p className="mt-1 font-semibold text-amber-200">{reopenHint}</p> : null}
    </div>
  );
}
