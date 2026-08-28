'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, Flame, Gift, Utensils } from 'lucide-react';
import { formatCurrency, formatPromotionTime } from '@mdh/utils';
import { useMarketing } from '@/components/marketing/marketing-provider';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function servedItems(ingredients?: string | null) {
  return (ingredients ?? '')
    .replace(/^includes?\s+/i, '')
    .split(/\s*(?:,|&)\s*/)
    .map((item) => item.replace(/\s+with every biryani\.?$/i, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function SundayBiryaniPromotion() {
  const marketing = useMarketing();
  const promotion = marketing?.byPlacement?.HERO_SECTION?.find(
    (item) =>
      item.promotionProduct &&
      item.promotionWebsiteEnabled !== false &&
      item.promotionDayOfWeek != null,
  );
  const product = promotion?.promotionProduct;

  if (!promotion || !product || !product.isAvailable) return null;

  const image = promotion.heroBannerImageUrl || promotion.bannerImageUrl || product.imageUrl;
  const href =
    promotion.ctaUrl?.trim() ||
    `/checkout?product=${encodeURIComponent(product.slug)}&promotion=${encodeURIComponent(promotion.id)}`;
  const cutoffDay =
    promotion.promotionPreOrderCutoffDay != null
      ? WEEKDAYS[promotion.promotionPreOrderCutoffDay]
      : null;
  const included = servedItems(product.ingredients);

  return (
    <section className="relative overflow-hidden bg-[#FFF8E8] py-5 sm:py-8 md:py-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#F59E0B]/10 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0B3B25] via-[#14532D] to-[#092719] text-white shadow-2xl shadow-[#14532D]/25"
        >
          <div className="grid items-stretch md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[230px] overflow-hidden sm:min-h-[280px] md:min-h-[380px]">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#7F1D1D] text-8xl">
                  🍛
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#092719] via-transparent to-transparent md:bg-gradient-to-r" />
              <div className="absolute left-4 top-4 rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#1F2937] shadow-lg">
                {promotion.icon || '🔥'} Sunday Special
              </div>
            </div>

            <div className="relative flex flex-col justify-center p-5 sm:p-8 md:p-10">
              <div className="pointer-events-none absolute right-6 top-5 text-4xl opacity-20">
                ✦
              </div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#FBBF24]">
                <Flame className="h-4 w-4" />
                {promotion.shortMessage || 'Freshly prepared for your Sunday table'}
              </p>
              <h2 className="max-w-xl text-3xl font-black leading-[0.98] tracking-tight sm:text-4xl md:text-5xl">
                {promotion.title || product.name}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                {promotion.message}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                    {promotion.promotionNextAvailableLabel || 'Upcoming Sunday'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm font-bold">
                    <Clock3 className="h-4 w-4 text-[#F59E0B]" />
                    {formatPromotionTime(promotion.promotionReadyTime)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#FBBF24]">
                    Price
                  </p>
                  <p className="mt-0.5 text-xl font-black text-[#FBBF24]">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>

              {included.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-[#FBBF24]/20 bg-black/10 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
                    <Gift className="h-4 w-4" /> With every biryani
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {included.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/90"
                      >
                        <Utensils className="h-3 w-3 text-[#F59E0B]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={href}
                  className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-6 text-sm font-black uppercase tracking-wide text-[#1F2937] shadow-lg shadow-[#F59E0B]/20 transition hover:bg-[#FBBF24] active:scale-[0.98]"
                >
                  {promotion.ctaText || 'Pre-order now'}
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <div className="text-xs leading-5 text-white/65">
                  {promotion.promotionPreOrderRequired
                    ? `Pre-order required by ${cutoffDay || 'the previous day'}`
                    : 'Pre-order recommended'}
                  <br />
                  {promotion.promotionRemainingQuantity != null
                    ? `${promotion.promotionRemainingQuantity} portions remaining`
                    : 'Limited quantities — pre-order recommended'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
