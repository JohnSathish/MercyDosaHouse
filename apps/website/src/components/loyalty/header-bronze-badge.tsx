'use client';

import Link from 'next/link';
import { useLoyaltyMe } from '@/lib/use-loyalty';

export function HeaderBronzeBadge({ transparent }: { transparent?: boolean }) {
  const { data } = useLoyaltyMe();
  if (!data?.account.enabled) return null;
  const coins = data.account.available;
  return (
    <Link
      href="/dashboard?tab=loyalty"
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
        transparent
          ? 'border-white/40 bg-white/10 text-white'
          : 'border-amber-200 bg-amber-50 text-[#14532D]'
      }`}
    >
      {data.account.coinSymbol} {coins} {data.account.coinName} · ₹{data.account.valueAvailable}
    </Link>
  );
}
