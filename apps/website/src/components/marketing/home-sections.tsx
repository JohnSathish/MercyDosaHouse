'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiClock, FiMapPin } from 'react-icons/fi';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import { APP_URLS } from '@/lib/app-urls';

function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${APP_URLS.website}${url.startsWith('/') ? url : `/${url}`}`;
}

/** Compact home-delivery card — below hero, driven by admin marketing delivery config. */
export function HomeDeliverySection() {
  const marketing = useMarketing();
  const delivery = marketing?.delivery;
  const cardAnnouncement = marketing?.byPlacement?.DELIVERY_CARD?.[0];

  if (!delivery && !cardAnnouncement) return null;

  const status = delivery?.status ?? 'LIMITED_AREA';
  const deliveryActive = status === 'AVAILABLE' || status === 'LIMITED_AREA';
  const areas = delivery?.areas?.length
    ? [...new Set(delivery.areas.map((a) => a.trim()).filter(Boolean))].join(' & ')
    : cardAnnouncement?.shortMessage;
  const orderWindow = deliveryActive
    ? (delivery?.orderWindow ??
      (delivery?.orderStartTime && delivery?.orderEndTime
        ? `${delivery.orderStartTime} – ${delivery.orderEndTime}`
        : null))
    : null;
  const deliveryWindow = deliveryActive
    ? (delivery?.deliveryWindow ??
      (delivery?.deliveryStartTime && delivery?.deliveryEndTime
        ? `${delivery.deliveryStartTime} – ${delivery.deliveryEndTime}`
        : null))
    : null;
  const primaryMessage =
    delivery?.message?.trim() ||
    cardAnnouncement?.message?.trim() ||
    (deliveryActive ? null : 'Pickup Orders Only — Home Delivery Is Not Available.');
  const expansionMessage = delivery?.expansionMessage?.trim() || null;
  const title = cardAnnouncement?.title ?? 'Home Delivery';

  return (
    <section className="py-6 md:py-8 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-[#14532D]/10 bg-white shadow-sm p-5 sm:p-6 max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl shrink-0" aria-hidden>
              {cardAnnouncement?.icon ?? (deliveryActive ? '🏠' : '🥡')}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#14532D] mb-2">
                {title}
              </h2>
              {primaryMessage && (
                <p className="text-[#1F2937] text-sm sm:text-base font-medium mb-3 flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#14532D]">{primaryMessage}</strong>
                  </span>
                </p>
              )}
              {deliveryActive && areas && !primaryMessage && (
                <p className="text-[#1F2937] text-sm sm:text-base font-medium mb-3 flex items-start gap-2">
                  <FiMapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>
                    Currently available in <strong className="text-[#14532D]">{areas}</strong>
                  </span>
                </p>
              )}
              {deliveryActive && areas && primaryMessage && (
                <p className="text-sm text-gray-600 mb-3 flex items-start gap-2">
                  <FiMapPin className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>
                    Serving <strong className="text-[#14532D]">{areas}</strong>
                  </span>
                </p>
              )}
              {(orderWindow || deliveryWindow) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-3">
                  {orderWindow && (
                    <span className="flex items-center gap-1.5">
                      <FiClock className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Order: <strong className="text-[#1F2937]">{orderWindow}</strong>
                    </span>
                  )}
                  {deliveryWindow && (
                    <span className="flex items-center gap-1.5">
                      <FiClock className="w-3.5 h-3.5 text-[#F59E0B]" />
                      Delivery: <strong className="text-[#1F2937]">{deliveryWindow}</strong>
                    </span>
                  )}
                </div>
              )}
              {expansionMessage && (
                <p className="text-sm text-[#F59E0B] font-semibold">{expansionMessage}</p>
              )}
              {cardAnnouncement?.ctaText && cardAnnouncement?.ctaUrl && (
                <Link
                  href={cardAnnouncement.ctaUrl}
                  className="inline-block mt-3 text-sm font-semibold text-[#14532D] hover:text-[#F59E0B] transition-colors"
                  onClick={() => trackMarketingEvent(cardAnnouncement.id, 'cta_click')}
                >
                  {cardAnnouncement.ctaText} →
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** Pre-order / coming-soon cards — HERO_SECTION placement with banner images. */
export function PreOrderComingSoonSection() {
  const marketing = useMarketing();
  const promos = (marketing?.byPlacement?.HERO_SECTION ?? marketing?.announcements ?? []).filter(
    (a) => (a.bannerImageUrl || a.heroBannerImageUrl) && a.isActive,
  );

  if (!promos.length) return null;

  return (
    <section className="py-8 md:py-12 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="text-[#F59E0B] font-semibold text-sm uppercase tracking-wider">
            🔥 Coming Soon & Pre-Order
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#14532D] mt-2">
            Order Ahead — Fresh When Ready
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {promos.map((promo, i) => {
            const imageUrl = resolveImageUrl(promo.heroBannerImageUrl ?? promo.bannerImageUrl);
            const isComingSoon = /coming soon/i.test(promo.title);
            return (
              <motion.article
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl overflow-hidden border border-[#14532D]/10 bg-[#FFF8E8] shadow-md hover:shadow-lg transition-shadow flex flex-col sm:flex-row"
              >
                {imageUrl && (
                  <div className="relative h-36 sm:h-auto sm:w-36 md:w-40 shrink-0">
                    <Image
                      src={imageUrl}
                      alt={promo.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 160px"
                      unoptimized={imageUrl.startsWith('http')}
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-[#F59E0B] px-2.5 py-1 text-[10px] font-bold text-[#1F2937] uppercase tracking-wide">
                      {isComingSoon ? 'Coming Soon' : 'Pre-Order'}
                    </span>
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1 min-w-0">
                  <p className="text-[#14532D] font-bold text-sm sm:text-base leading-snug mb-1">
                    {promo.icon ? `${promo.icon} ` : ''}
                    {promo.title}
                  </p>
                  {promo.shortMessage && (
                    <p className="text-[#F59E0B] text-xs font-semibold mb-2">
                      {promo.shortMessage}
                    </p>
                  )}
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed flex-1 line-clamp-3">
                    {promo.message}
                  </p>
                  {(promo.ctaUrl || promo.linkUrl) && (
                    <Link
                      href={promo.ctaUrl ?? promo.linkUrl ?? '/checkout?preorder=1'}
                      className="inline-flex self-start mt-3 rounded-xl bg-[#14532D] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#14532D]/90 transition-colors"
                      onClick={() => trackMarketingEvent(promo.id, 'cta_click')}
                    >
                      {promo.ctaText ?? 'Pre-Order'}
                    </Link>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
