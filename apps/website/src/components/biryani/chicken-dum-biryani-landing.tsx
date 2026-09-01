'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type {
  AppPromoConfigDto,
  BusinessSettingsDto,
  MarketingAnnouncementDto,
  OfferDto,
  ProductDto,
} from '@mdh/types';
import {
  ANDROID_PLAY_STORE_URL,
  calculateDeliveryCharge,
  calculatePackingTotal,
  formatCurrency,
  formatPromotionTime,
  promotionTimeParts,
} from '@mdh/utils';
import { api } from '@/lib/api';
import { trackMarketingEvent } from '@/lib/marketing-content';
import { getProductImage, productImageAlt } from '@/lib/product-images';
import { formatSundayLong, nextBiryaniSunday, parseBiryaniInclusions } from '@/lib/chicken-biryani';

function liveAppDiscountPct(offers: OfferDto[]): number | null {
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

export function ChickenDumBiryaniLanding({
  product,
  settings,
  promotion,
  offers,
}: {
  product: ProductDto;
  settings: BusinessSettingsDto | null;
  promotion: MarketingAnnouncementDto | null;
  offers: OfferDto[];
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [appPromo, setAppPromo] = useState<AppPromoConfigDto | null>(null);

  useEffect(() => {
    void api
      .get<AppPromoConfigDto>('/settings/app-promo')
      .then(setAppPromo)
      .catch(() => setAppPromo(null));
  }, []);

  useEffect(() => {
    if (!promotion?.id) return;
    void trackMarketingEvent(promotion.id, 'impression', { surface: 'biryani_landing' });
    void trackMarketingEvent(promotion.id, 'view', { surface: 'biryani_landing' });
  }, [promotion?.id]);

  const image = getProductImage(product);
  const localImage = image.startsWith('/images/');
  const packingUnit = Number(product.packingCharge ?? settings?.packingCharge ?? 20);
  const packing = calculatePackingTotal([{ quantity: qty, packingCharge: packingUnit }]);
  const subtotal = product.price * qty;
  const delivery = calculateDeliveryCharge(subtotal, {
    deliveryCharge: settings?.deliveryCharge ?? 30,
    freeDeliveryLimit: settings?.freeDeliveryLimit ?? 299,
    orderType: 'DELIVERY',
  }).amount;
  const total = subtotal + packing + delivery;

  const schedule = nextBiryaniSunday({
    dayOfWeek: promotion?.promotionDayOfWeek,
    readyTime: promotion?.promotionReadyTime,
    preOrderRequired: promotion?.promotionPreOrderRequired,
    preOrderCutoffDay: promotion?.promotionPreOrderCutoffDay,
  });
  const readyLabel = formatPromotionTime(promotion?.promotionReadyTime) || '1:00 PM';
  const soldOut =
    !product.isAvailable ||
    (promotion?.promotionRemainingQuantity != null && promotion.promotionRemainingQuantity <= 0);
  const today = promotionTimeParts(new Date());
  const promoDay = promotion?.promotionDayOfWeek ?? 0;
  const preOrdersClosedToday = today.weekday === promoDay && schedule.daysAhead > 0;
  const canOrder = !soldOut;
  const nextLabel = formatSundayLong(schedule.date);
  const inclusions = parseBiryaniInclusions(
    [product.ingredients, product.description, promotion?.message, promotion?.shortMessage]
      .filter(Boolean)
      .join(' '),
  );
  const presentation =
    product.description?.trim() ||
    'Fragrant basmati rice, tender chicken and traditional dum-cooked flavour — freshly prepared for Sunday.';
  const appDiscount = liveAppDiscountPct(offers);
  const playHref = appPromo?.playStoreUrl || ANDROID_PLAY_STORE_URL;

  const checkoutHref = `/checkout?product=${encodeURIComponent(product.slug)}${
    promotion?.id ? `&promotion=${encodeURIComponent(promotion.id)}` : ''
  }&qty=${qty}&preorder=1`;

  function goCheckout() {
    if (!canOrder) return;
    if (promotion?.id) {
      void trackMarketingEvent(promotion.id, 'prebook_click', {
        surface: 'biryani_landing',
        qty,
      });
      void trackMarketingEvent(promotion.id, 'cta_click', { surface: 'biryani_landing' });
    }
    router.push(checkoutHref);
  }

  const weekdayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[promotion?.promotionDayOfWeek ?? 0] ?? 'Sunday';
  }, [promotion?.promotionDayOfWeek]);

  return (
    <div className="bg-[#FFF8E8] pb-28 lg:pb-16">
      <section className="relative overflow-hidden bg-[#0B3B25] text-white">
        <div className="container mx-auto grid gap-0 px-4 lg:grid-cols-2 lg:items-center">
          <div className="relative -mx-4 h-[280px] sm:h-[360px] lg:mx-0 lg:h-[520px]">
            {localImage ? (
              <Image
                src={image}
                alt={productImageAlt(product)}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <img
                src={image}
                alt={productImageAlt(product)}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3B25] via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
          <div className="relative py-6 lg:py-16 lg:pl-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FBBF24]">
              Sunday Special
            </p>
            <h1 className="mt-2 text-4xl font-black leading-[0.95] sm:text-5xl">{product.name}</h1>
            <p className="mt-3 text-sm font-semibold text-[#FDE68A]">
              Authentic • Aromatic • Freshly Prepared
            </p>
            <p className="mt-4 text-5xl font-black text-[#FBBF24]">
              {formatCurrency(product.price)}
            </p>
            <p className="mt-2 text-sm text-white/85">
              Every {weekdayName} · Ready at {readyLabel}
              {promotion?.promotionPreOrderRequired !== false ? ' · Pre-order required' : ''}
            </p>
            {preOrdersClosedToday ? (
              <p className="mt-3 rounded-xl bg-black/30 px-3 py-2 text-sm font-semibold text-[#FDE68A]">
                Sunday pre-orders are closed. Next available: {nextLabel}
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/80">Next available: {nextLabel}</p>
            )}
            <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
              <button
                type="button"
                disabled={!canOrder}
                onClick={goCheckout}
                className="inline-flex min-h-12 items-center rounded-2xl bg-[#F59E0B] px-6 text-sm font-black uppercase tracking-wide text-[#1F2937] disabled:opacity-50"
              >
                {preOrdersClosedToday ? 'Pre-book next Sunday' : 'Pre-book biryani now'}
              </button>
              <Link
                href="/menu"
                className="inline-flex min-h-12 items-center rounded-2xl border border-white/25 px-6 text-sm font-bold uppercase tracking-wide"
              >
                Order online
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <p className="rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm">
            🍗 Available every {weekdayName}
          </p>
          <p className="rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm">
            ⏰ Ready at {readyLabel}
          </p>
          <p className="rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm">
            📅 Pre-order one day in advance
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-[#14532D]">Your plate</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{presentation}</p>
          {inclusions.length ? (
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                With every biryani
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {inclusions.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-xl border border-[#14532D]/10 bg-[#FFF8E8] px-3 py-2 text-sm font-semibold"
                  >
                    {item.emoji} {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[#14532D]">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-11 w-11 rounded-full border text-xl font-bold"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-6 text-center text-lg font-black">{qty}</span>
              <button
                type="button"
                className="h-11 w-11 rounded-full border text-xl font-bold"
                onClick={() => setQty((n) => Math.min(20, n + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>
                {product.name} × {qty}
              </dt>
              <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Packing</dt>
              <dd className="font-semibold">{formatCurrency(packing)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="font-semibold">
                {delivery === 0 ? 'Free' : formatCurrency(delivery)}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-black text-[#14532D]">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            Checkout calculates the final total on the server. Delivery applies to eligible areas.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-8">
        <div className="rounded-3xl border border-[#F59E0B]/40 bg-[#14532D] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#FBBF24]">
            Sunday biryani pre-order
          </p>
          <ul className="mt-3 space-y-1 text-sm text-white/90">
            <li>📅 Every {weekdayName}</li>
            <li>⏰ Ready at {readyLabel}</li>
            <li>📦 Pre-order one day in advance</li>
            <li>🚚 Home delivery according to current delivery areas</li>
          </ul>
          <button
            type="button"
            disabled={!canOrder}
            onClick={goCheckout}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-black uppercase text-[#1F2937] sm:w-auto"
          >
            {preOrdersClosedToday ? 'Pre-book next Sunday' : 'Order / pre-book now'}
          </button>
        </div>
      </section>

      {appPromo?.enabled && appPromo.showOnWebsite ? (
        <section className="container mx-auto px-4 pb-8">
          <div className="rounded-3xl bg-[#1F2937] p-5 text-white">
            <h2 className="text-lg font-bold">
              {appDiscount != null
                ? `Get ${appDiscount}% off on your first app order`
                : appPromo.title}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              {appDiscount != null
                ? 'Download the Mercy Dosa House App and enjoy your eligible app-exclusive offer.'
                : appPromo.body}
            </p>
            <a
              href={playHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-[#14532D]"
            >
              {appPromo.ctaLabel || 'Download app'}
            </a>
          </div>
        </section>
      ) : null}

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[#F59E0B]/40 bg-[#0B3B25] px-4 py-3 text-white safe-area-pb">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#FBBF24]">
              🔥 Sunday biryani
            </p>
            <p className="truncate text-lg font-black">{formatCurrency(product.price)}</p>
          </div>
          <button
            type="button"
            disabled={!canOrder}
            onClick={goCheckout}
            className="ml-auto inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[#F59E0B] px-4 text-sm font-black uppercase text-[#1F2937] disabled:opacity-50"
          >
            Pre-book now
          </button>
        </div>
      </div>
    </div>
  );
}
