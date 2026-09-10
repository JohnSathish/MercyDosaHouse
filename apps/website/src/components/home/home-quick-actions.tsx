'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import type { OrderDto } from '@mdh/types';
import { loadLastOrder } from '@/lib/last-order';
import { reorderOrderToCart } from '@/lib/reorder-order';
import { useToastStore } from '@/lib/toast-store';
import {
  loadRecentlyViewed,
  RECENTLY_VIEWED_EVENT,
  type RecentlyViewedItem,
} from '@/lib/recently-viewed';

export function HomeReorderBanner() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrder(loadLastOrder());
  }, []);

  if (!order?.items?.length) return null;

  const summary = order.items
    .slice(0, 3)
    .map((i) => i.productName)
    .join(', ');

  async function orderAgain() {
    if (!order) return;
    setBusy(true);
    try {
      const { added, skipped } = await reorderOrderToCart(order);
      if (added > 0) {
        if (skipped.length) toast(`${skipped.length} item(s) unavailable and were skipped.`);
        else toast('Items added to your cart.');
        router.push('/cart');
      } else {
        toast('None of the items from this order are available right now.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-[#14532D] py-6">
      <div className="container mx-auto flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Order again</p>
          <p className="mt-1 text-lg font-bold">#{order.orderNumber}</p>
          <p className="mt-0.5 truncate text-sm text-white/80">
            {summary}
            {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''} ·{' '}
            {formatCurrency(order.grandTotal)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={`/track/${order.orderNumber}`} className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              Track
            </Button>
          </Link>
          <Button
            className="w-full gap-1 bg-[#F59E0B] text-[#1F2937] hover:bg-[#FBBF24] sm:w-auto"
            disabled={busy}
            onClick={() => void orderAgain()}
          >
            <RotateCcw className="h-4 w-4" />
            {busy ? 'Adding…' : 'Order again'}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function RecentlyViewedStrip() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(loadRecentlyViewed());
    sync();
    window.addEventListener(RECENTLY_VIEWED_EVENT, sync);
    return () => window.removeEventListener(RECENTLY_VIEWED_EVENT, sync);
  }, []);

  if (!items.length) return null;

  return (
    <section className="bg-[#FFF8E8] py-8">
      <div className="container mx-auto px-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5A000]">
          Continue browsing
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#14532D]">Recently viewed</h2>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/menu/${p.slug}`}
              className="w-40 shrink-0 rounded-2xl border border-[#14532D]/10 bg-white p-3 shadow-sm"
            >
              <p className="line-clamp-2 text-sm font-bold text-[#14532D]">{p.name}</p>
              <p className="mt-1 text-sm font-semibold text-[#1F2937]">{formatCurrency(p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
