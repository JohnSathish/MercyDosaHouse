'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3 } from 'lucide-react';
import {
  calculateDeliveryCharge,
  formatCurrency,
  formatPromotionTime,
  isChickenDumBiryaniProduct,
  promotionDeliverySlot,
  resolvePublicMediaUrl,
} from '@mdh/utils';
import { SiteLogoMark } from '@/components/site-logo';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import { useBusinessSettings } from '@/hooks/use-order-charges';
import { APP_URLS } from '@/lib/app-urls';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FALLBACK_IMAGE = '/images/chicken-biryani.png';

function promoImageSrc(url?: string | null) {
  if (!url?.trim()) return FALLBACK_IMAGE;
  if (url.startsWith('/images/')) return url;
  return resolvePublicMediaUrl(url, APP_URLS.website) || FALLBACK_IMAGE;
}

export function SundayBiryaniPromotion() {
  const marketing = useMarketing();
  const { data: settings } = useBusinessSettings();
  const tracked = useRef(false);
  const promotion =
    marketing?.announcements?.find(
      (item) =>
        item.promotionWebsiteEnabled !== false &&
        item.promotionDayOfWeek != null &&
        item.promotionProduct &&
        isChickenDumBiryaniProduct(item.promotionProduct),
    ) ??
    marketing?.byPlacement?.HERO_SECTION?.find(
      (item) =>
        item.promotionProduct &&
        item.promotionWebsiteEnabled !== false &&
        item.promotionDayOfWeek != null,
    );
  const product = promotion?.promotionProduct;

  const packing = Number(settings?.packingCharge ?? 20);
  const delivery = useMemo(() => {
    if (!product) return 0;
    return calculateDeliveryCharge(product.price, {
      deliveryCharge: settings?.deliveryCharge ?? 30,
      freeDeliveryLimit: settings?.freeDeliveryLimit ?? 299,
      orderType: 'DELIVERY',
    }).amount;
  }, [product, settings?.deliveryCharge, settings?.freeDeliveryLimit]);

  useEffect(() => {
    if (!promotion?.id || tracked.current) return;
    tracked.current = true;
    void trackMarketingEvent(promotion.id, 'impression', { surface: 'homepage_sunday_special' });
    void trackMarketingEvent(promotion.id, 'view', { surface: 'homepage_sunday_special' });
  }, [promotion?.id]);

  if (!promotion || !product) return null;

  const image = promoImageSrc(
    promotion.heroBannerImageUrl || promotion.bannerImageUrl || product.imageUrl,
  );
  const soldOut =
    !product.isAvailable ||
    (promotion.promotionRemainingQuantity != null && promotion.promotionRemainingQuantity <= 0);
  const href = soldOut
    ? undefined
    : promotion.ctaUrl?.trim() ||
      `/checkout?product=${encodeURIComponent(product.slug)}&promotion=${encodeURIComponent(promotion.id)}&preorder=1`;
  const cutoffDay =
    promotion.promotionPreOrderCutoffDay != null
      ? WEEKDAYS[promotion.promotionPreOrderCutoffDay]
      : 'Saturday';
  const readyLabel = formatPromotionTime(promotion.promotionReadyTime) || '1:00 PM';
  const slotLabel = promotionDeliverySlot(promotion.promotionReadyTime);
  const total = product.price + packing + delivery;
  const weekdayInKolkata = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(new Date());
  const todayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayInKolkata);
  const isPromotionDay = promotion.promotionDayOfWeek === todayIndex;
  const specialEyebrow = soldOut
    ? 'SUNDAY BIRYANI SOLD OUT'
    : isPromotionDay
      ? "TODAY'S SPECIAL"
      : "THIS SUNDAY'S SPECIAL";
  const specialHint = soldOut
    ? 'Pre-orders are closed for this Sunday.'
    : isPromotionDay
      ? `Ready at ${readyLabel}`
      : `Pre-order by ${cutoffDay}`;
  const cta = (promotion.ctaText || 'PRE-BOOK YOUR BIRYANI').toUpperCase();

  const promotionId = promotion.id;
  const trackPrebook = () => {
    void trackMarketingEvent(promotionId, 'prebook_click', { surface: 'homepage_sunday_special' });
    void trackMarketingEvent(promotionId, 'cta_click', { surface: 'homepage_sunday_special' });
  };

  const content = (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      className={`group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0B3B25] via-[#14532D] to-[#092719] text-white shadow-2xl shadow-[#14532D]/30 ring-1 ring-[#F59E0B]/25 ${
        href ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FBBF24] to-transparent opacity-80" />
      <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="relative h-[200px] overflow-hidden sm:h-[240px] md:h-auto md:min-h-[340px]">
          {image.startsWith('/images/') ? (
            <Image
              src={image}
              alt={`${product.name} — Sunday special Chicken Dum Biryani`}
              fill
              sizes="(max-width: 768px) 100vw, 48vw"
              className="object-cover transition duration-700 group-hover:scale-105"
              priority
            />
          ) : (
            <img
              src={image}
              alt={`${product.name} — Sunday special Chicken Dum Biryani`}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#092719] via-[#092719]/20 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#092719]/80" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#1F2937] shadow-lg">
              Limited Sunday Special
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-center p-4 sm:p-6 md:p-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SiteLogoMark size="sm" showName className="text-white" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FBBF24]">
              Every Sunday • {readyLabel}
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#FBBF24]">
            {specialEyebrow}
          </p>
          <h2 className="mt-1 max-w-xl text-[1.65rem] font-black leading-[1.02] tracking-tight sm:text-4xl">
            {promotion.title || 'CHICKEN DUM BIRYANI'}
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#FDE68A]">{specialHint}</p>
          <p className="mt-2 text-sm text-white/80">
            {promotion.shortMessage ||
              promotion.message ||
              'Freshly prepared for your Sunday table.'}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                Biryani
              </dt>
              <dd className="font-black text-[#FDE68A]">{formatCurrency(product.price)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                Packing
              </dt>
              <dd className="font-black">{formatCurrency(packing)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                Delivery
              </dt>
              <dd className="font-black">{delivery === 0 ? 'Free' : formatCurrency(delivery)}</dd>
            </div>
            <div className="rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                Total
              </dt>
              <dd className="font-black text-[#FBBF24]">{formatCurrency(total)}</dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5 text-[#F59E0B]" />
              Ready {slotLabel}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              📅 Pre-order by {cutoffDay}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              {soldOut
                ? 'Sold out / Pre-orders closed'
                : promotion.promotionRemainingQuantity != null
                  ? `Limited Sunday quantity · ${promotion.promotionRemainingQuantity} left`
                  : 'Limited Sunday quantity'}
            </span>
          </div>
          {!soldOut && !isPromotionDay ? (
            <p className="mt-2 text-sm font-semibold text-[#FDE68A]">
              Pre-order now for this Sunday!
            </p>
          ) : null}

          <div className="mt-4">
            {soldOut ? (
              <span className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black uppercase tracking-wide text-white/80 sm:w-auto">
                Sold Out / Pre-orders Closed
              </span>
            ) : (
              <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-6 text-sm font-black uppercase tracking-wide text-[#1F2937] shadow-lg shadow-[#F59E0B]/25 transition group-hover:bg-[#FBBF24] group-focus-visible:ring-2 group-focus-visible:ring-[#FDE68A] sm:w-auto">
                {cta}
                <ArrowRight className="h-5 w-5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );

  return (
    <section className="relative overflow-hidden bg-[#FFF8E8] py-4 sm:py-7 md:py-9">
      <div className="container relative mx-auto px-4">
        {href ? (
          <Link
            href={href}
            onClick={trackPrebook}
            className="block rounded-[1.75rem] outline-none focus-visible:ring-4 focus-visible:ring-[#F59E0B]/60"
            aria-label={`${cta} — ${product.name}`}
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
