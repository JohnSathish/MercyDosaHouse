'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Clock, Award, Star, Users, Flame } from 'lucide-react';
import { BRAND } from '@mdh/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReviewSummaryDto } from '@mdh/types';

const SHOWCASE_ITEMS = [
  { src: '/images/idli-4-pieces.png', label: 'Soft Idli', tag: '4 pcs' },
  { src: '/images/vada-4-pieces.png', label: 'Crispy Vada', tag: '4 pcs' },
  { src: '/images/ghee-roast-dosa.png', label: 'Ghee Roast', tag: 'Premium' },
  {
    src: '/images/chicken-biryani.png',
    label: 'Mercy Special Chicken Dum Biryani',
    tag: 'Premium',
  },
];

const TRUST_STATS = [
  { icon: Users, value: '500+', label: 'Happy Customers' },
  { icon: Star, value: '4.8★', label: 'Average Rating' },
  { icon: Flame, value: '30 min', label: 'Hot Delivery' },
];

const VALUE_PROPS = [
  { icon: Leaf, label: 'Fresh Ingredients' },
  { icon: ShieldCheck, label: 'Hygienic Kitchen' },
  { icon: Clock, label: 'On-Time Delivery' },
  { icon: Award, label: 'Quality Assured' },
];

export function LoginBrandingPanel() {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const { data: summary } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => api.get<ReviewSummaryDto>('/reviews/summary'),
    staleTime: 60_000,
  });
  const trustStats =
    summary && summary.totalReviews > 0
      ? TRUST_STATS.map((s) =>
          s.label === 'Average Rating' ? { ...s, value: `${summary.averageRating}★` } : s,
        )
      : TRUST_STATS.filter((s) => s.label !== 'Average Rating');

  return (
    <div className="relative hidden lg:grid lg:grid-cols-2 min-h-[calc(100vh-4.5rem)] overflow-hidden bg-[#0f3d24]">
      {/* ── Background layers (clipped to panel) ── */}
      <div className="absolute inset-0 hero-pattern pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_75%_50%,rgba(245,158,11,0.18),transparent_60%)] pointer-events-none" />

      {/* Vertical divider between inner splits */}
      <div className="absolute top-8 bottom-8 left-1/2 w-px bg-white/10 pointer-events-none z-10" />

      {/* ═══════════ LEFT SPLIT — Copy & trust ═══════════ */}
      <div className="relative z-10 flex flex-col justify-center px-10 xl:px-14 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/images/logo.png"
              alt={BRAND.name}
              width={52}
              height={52}
              className="rounded-full ring-2 ring-white/25 bg-white shrink-0"
            />
            <div>
              <p className="text-xl font-bold text-white leading-tight">{BRAND.name}</p>
              <p className="text-[#F59E0B] text-[10px] font-semibold uppercase tracking-[0.22em] mt-0.5">
                Authentic South Indian Flavours
              </p>
            </div>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
            Crispy dosas &amp; hot meals, <span className="text-[#F59E0B]">delivered fresh</span> to
            your door.
          </h2>
          <p className="mt-4 text-base text-white/70 leading-relaxed max-w-sm">
            Order from Tura&apos;s favourite South Indian kitchen — made with love, served on time.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-8">
            {trustStats.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-xl bg-white/10 border border-white/12 px-2 py-3 text-center"
              >
                <Icon className="h-4 w-4 text-[#F59E0B] mx-auto mb-1" />
                <p className="text-base font-bold text-white">{value}</p>
                <p className="text-[9px] text-white/60 leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15">
                  <Icon className="h-3.5 w-3.5 text-[#F59E0B]" />
                </div>
                <span className="text-[11px] font-medium text-white/85">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════ RIGHT SPLIT — Food showcase (contained) ═══════════ */}
      <div className="relative z-10 flex flex-col justify-center px-8 xl:px-10 py-12 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative w-full max-w-[420px] mx-auto"
        >
          {/* Hero dish — contained, no overflow glow */}
          <div className="relative aspect-square w-full max-w-[340px] mx-auto mb-4">
            <div className="absolute inset-0 rounded-[1.75rem] bg-[#F59E0B]/15 blur-2xl scale-95 pointer-events-none" />
            <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
              <Image
                src="/images/hero-dosa.png"
                alt="Masala Dosa"
                fill
                className="object-cover"
                priority={isLargeScreen === true}
                sizes="340px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e18]/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-white">Masala Dosa</p>
                  <p className="text-xs text-white/70">Crispy &amp; spiced potato filling</p>
                </div>
                <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-bold text-[#1F2937]">
                  Best Seller
                </span>
              </div>
            </div>
          </div>

          {/* Thumbnail row — 4 items */}
          <div className="grid grid-cols-4 gap-2.5">
            {SHOWCASE_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                className="relative aspect-square overflow-hidden rounded-xl border border-white/15 shadow-lg"
              >
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  className="object-cover"
                  sizes="80px"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-1.5">
                  <p className="text-[8px] font-bold text-white leading-tight truncate">
                    {item.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Clean straight edge to cream panel */}
      <div className="absolute inset-y-0 right-0 w-px bg-[#FFF8E8]/20 pointer-events-none z-20" />
    </div>
  );
}
