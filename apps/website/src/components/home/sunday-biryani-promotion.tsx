'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  calculateDeliveryCharge,
  formatCurrency,
  formatPromotionTime,
  isChickenDumBiryaniProduct,
  nextPromotionDate,
  resolvePublicMediaUrl,
} from '@mdh/utils';
import type { ProductDto } from '@mdh/types';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import { useBusinessSettings } from '@/hooks/use-order-charges';
import { productImageAlt } from '@/lib/product-images';
import { APP_URLS } from '@/lib/app-urls';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FALLBACK_IMAGE = '/images/chicken-biryani.png';

function promoImageSrc(url?: string | null) {
  if (!url?.trim()) return FALLBACK_IMAGE;
  if (url.startsWith('/images/')) return url;
  return resolvePublicMediaUrl(url, APP_URLS.website) || FALLBACK_IMAGE;
}

export function SundayBiryaniPromotion({ products = [] }: { products?: ProductDto[] }) {
  const marketing = useMarketing();
  const { data: settings } = useBusinessSettings();
  const tracked = useRef(false);
  const promotion =
    marketing?.announcements?.find(
      (item) =>
        item.promotionWebsiteEnabled !== false &&
        item.promotionProduct &&
        isChickenDumBiryaniProduct(item.promotionProduct),
    ) ??
    marketing?.byPlacement?.HERO_SECTION?.find(
      (item) =>
        item.promotionProduct &&
        item.promotionWebsiteEnabled !== false &&
        item.promotionDayOfWeek != null,
    );
  const product =
    promotion?.promotionProduct ??
    products.find((item) => isChickenDumBiryaniProduct(item)) ??
    null;

  const packing = Number(product?.packingCharge ?? settings?.packingCharge ?? 20);
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

  if (!product || product.isAvailable === false) return null;

  const image = promoImageSrc(
    promotion?.heroBannerImageUrl || promotion?.bannerImageUrl || product.imageUrl,
  );
  const soldOut =
    promotion?.promotionRemainingQuantity != null && promotion.promotionRemainingQuantity <= 0;
  let preOrderOpen = !soldOut;
  if (preOrderOpen && promotion?.promotionDayOfWeek != null) {
    try {
      nextPromotionDate({
        dayOfWeek: promotion.promotionDayOfWeek,
        readyTime: promotion.promotionReadyTime || '13:00',
        preOrderRequired: promotion.promotionPreOrderRequired !== false,
        preOrderCutoffDay: promotion.promotionPreOrderCutoffDay,
      });
    } catch {
      preOrderOpen = false;
    }
  }
  const href = preOrderOpen ? '/chicken-dum-biryani-tura' : undefined;
  const cutoffDay =
    promotion?.promotionPreOrderCutoffDay != null
      ? WEEKDAYS[promotion.promotionPreOrderCutoffDay]
      : 'Saturday';
  const readyLabel = formatPromotionTime(promotion?.promotionReadyTime) || '1:00 PM';
  const total = product.price + packing + delivery;
  const localImage = image.startsWith('/images/');
  const name = product.name.replace(/^Mercy Special\s+/i, '');

  const trackPrebook = () => {
    if (!promotion?.id) return;
    void trackMarketingEvent(promotion.id, 'prebook_click', { surface: 'homepage_sunday_special' });
    void trackMarketingEvent(promotion.id, 'cta_click', { surface: 'homepage_sunday_special' });
  };

  const body = (
    <article className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#064728] via-[#0B542F] to-[#083820] text-white shadow-2xl ring-1 ring-[#F5A000]/30">
      <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="relative h-[240px] sm:h-[300px] md:h-auto md:min-h-[380px]">
          {localImage ? (
            <Image
              src={image}
              alt={productImageAlt({ name: product.name, slug: product.slug })}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <img
              src={image}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span className="absolute left-4 top-4 rounded-full bg-[#F5A000] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#18352A]">
            Limited Sunday Special
          </span>
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F5A000]">
            Sunday Special
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase leading-[0.95] tracking-tight text-[#F5A000] sm:text-5xl">
            {name}
          </h2>
          <p className="mt-3 text-sm font-semibold text-white/90">
            Every Sunday · Ready at {readyLabel}
          </p>
          <p className="mt-1 text-sm text-[#FDE68A]">Pre-order by {cutoffDay}</p>
          <dl className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase text-[#F5A000]">Biryani</dt>
              <dd className="font-black text-[#FDE68A]">{formatCurrency(product.price)}</dd>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase text-[#F5A000]">Packing</dt>
              <dd className="font-black">{formatCurrency(packing)}</dd>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase text-[#F5A000]">Delivery</dt>
              <dd className="font-black">{delivery === 0 ? 'Free' : formatCurrency(delivery)}</dd>
            </div>
            <div className="rounded-xl bg-[#F5A000]/20 px-3 py-2 ring-1 ring-[#F5A000]/50">
              <dt className="text-[10px] font-bold uppercase text-[#F5A000]">Total</dt>
              <dd className="font-black text-[#F5A000]">{formatCurrency(total)}</dd>
            </div>
          </dl>
          {soldOut ? (
            <p className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white/10 px-5 text-sm font-black uppercase">
              Sold out / Pre-orders closed
            </p>
          ) : (
            <span className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#F5A000] px-6 text-sm font-black uppercase tracking-wide text-[#18352A] sm:w-auto">
              Pre-book your biryani
              <ArrowRight className="h-5 w-5" />
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <section className="bg-[#FFF8E8] py-4 sm:py-8">
      <div className="container mx-auto px-4">
        {href ? (
          <Link
            href={href}
            onClick={trackPrebook}
            className="block rounded-[1.75rem] outline-none focus-visible:ring-4 focus-visible:ring-[#F5A000]/50"
            aria-label={`Pre-book ${product.name}`}
          >
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      {href ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-[#F5A000]/40 bg-[#0B542F] px-4 py-2.5 text-white lg:hidden">
          <Link
            href={href}
            onClick={trackPrebook}
            className="flex min-h-11 items-center justify-between gap-3"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wide text-[#F5A000]">
                Sunday biryani
              </span>
              <span className="block truncate text-sm font-black">
                {formatCurrency(product.price)}
              </span>
            </span>
            <span className="rounded-xl bg-[#F5A000] px-4 py-2 text-xs font-black uppercase text-[#18352A]">
              Pre-book now
            </span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
