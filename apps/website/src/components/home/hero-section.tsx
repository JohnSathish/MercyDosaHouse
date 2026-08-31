'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiStar, FiClock, FiCoffee } from 'react-icons/fi';
import { Button } from '@mdh/ui';
import { BRAND } from '@mdh/utils';
import { AnimatedCounter } from './hero-animated-counter';
import { HeroOrbitShowcase } from './hero-orbit-showcase';
import { HeroMobileCarousel } from './hero-mobile-carousel';
import { HeroOrderNotification } from './hero-order-notification';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { getHeroContent } from '@/lib/cms-content';
import type { HeroSectionContent } from '@mdh/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ReviewSummaryDto } from '@mdh/types';

const DEFAULT_HERO: HeroSectionContent = {
  badge: 'Authentic South Indian Flavours',
  title: BRAND.name,
  subtitle:
    'Freshly made South Indian food — crispy dosas, fluffy idlis & aromatic biryani in Tura.',
  ctaPrimary: { label: 'Order Now', href: '/menu' },
  ctaSecondary: { label: 'View Menu', href: '/menu' },
  stats: [
    { value: 1000, suffix: '+', label: 'Orders Delivered' },
    { value: 4.9, prefix: '★ ', label: 'Average Rating' },
    { value: 25, suffix: ' min', label: 'Avg Delivery' },
  ],
};

const HERO_STATS = DEFAULT_HERO.stats!;

function HeroCtaButton({
  href,
  children,
  variant,
}: {
  href: string;
  children: React.ReactNode;
  variant: 'primary' | 'outline';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Link href={href} className="group relative inline-flex">
      <motion.span
        className={`absolute inset-0 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isPrimary ? 'bg-[#F59E0B]/50' : 'bg-white/20'
        }`}
        aria-hidden
      />
      <Button
        size="lg"
        className={`relative min-h-[52px] rounded-2xl font-semibold px-8 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98] ${
          isPrimary
            ? 'btn-glow bg-[#F59E0B] text-[#1F2937] hover:bg-[#F59E0B]/90 shadow-lg shadow-[#F59E0B]/25'
            : 'border-2 border-white bg-transparent text-white hover:bg-white/15'
        }`}
      >
        {children}
      </Button>
    </Link>
  );
}

function HeroLeftContent({ compact = false }: { compact?: boolean }) {
  const cms = useCmsContent();
  const hero = (cms ? getHeroContent(cms) : null) ?? DEFAULT_HERO;
  const stats = hero.stats ?? HERO_STATS;
  const { data: summary } = useQuery({
    queryKey: ['review-summary'],
    queryFn: () => api.get<ReviewSummaryDto>('/reviews/summary'),
    staleTime: 60_000,
  });
  const hasRating = Boolean(summary && summary.totalReviews > 0);
  const ratingLabel = hasRating ? `${summary!.averageRating} Rating` : null;
  const liveStats = stats
    .filter((stat) => !stat.label.toLowerCase().includes('rating') || hasRating)
    .map((stat) =>
      stat.label.toLowerCase().includes('rating') && summary
        ? { ...stat, value: summary.averageRating }
        : stat,
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className={`relative z-10 ${compact ? 'text-center' : ''}`}
    >
      <p className="text-[#F59E0B] font-semibold text-xs sm:text-sm uppercase tracking-[0.2em] mb-2 sm:mb-3">
        {hero.badge}
      </p>
      <h1
        className={`font-bold leading-tight mb-3 sm:mb-4 ${
          compact ? 'text-3xl' : 'text-4xl md:text-5xl lg:text-6xl'
        }`}
      >
        {hero.title}
      </h1>
      <p
        className={`text-white/85 mb-5 sm:mb-6 max-w-lg ${compact ? 'text-base mx-auto' : 'text-lg md:text-xl'}`}
      >
        {hero.subtitle}
      </p>

      {ratingLabel ? (
        <div className={`flex items-center gap-2 mb-5 sm:mb-6 ${compact ? 'justify-center' : ''}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <FiStar key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-[#F59E0B] text-[#F59E0B]" />
          ))}
          <span className="text-white/90 font-medium ml-1 text-sm sm:text-base">{ratingLabel}</span>
        </div>
      ) : null}

      <div
        className={`grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-md ${compact ? 'mx-auto' : ''}`}
      >
        {liveStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-2 py-2.5 sm:px-3 sm:py-3 text-center"
          >
            <p className="text-lg sm:text-xl font-bold text-white">
              {stat.prefix?.includes('★') ? (
                <>★ {stat.value}</>
              ) : (
                <>
                  {stat.prefix}
                  <AnimatedCounter value={stat.value} suffix={stat.suffix ?? ''} />
                </>
              )}
            </p>
            <p className="text-[9px] sm:text-[10px] text-white/65 leading-tight mt-0.5">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      <div className={`flex flex-wrap gap-3 mb-5 sm:mb-6 ${compact ? 'justify-center px-2' : ''}`}>
        <HeroCtaButton href={hero.ctaPrimary?.href ?? '/menu'} variant="primary">
          {hero.ctaPrimary?.label ?? 'Order Now'}
        </HeroCtaButton>
        <HeroCtaButton href={hero.ctaSecondary?.href ?? '/menu'} variant="outline">
          {hero.ctaSecondary?.label ?? 'View Menu'}
        </HeroCtaButton>
      </div>

      <div
        className={`flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm ${compact ? 'justify-center' : ''}`}
      >
        {[
          { icon: FiClock, text: 'Freshly Made to Order' },
          { icon: FiCoffee, text: 'Premium Ingredients' },
        ].map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-white/10"
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F59E0B] shrink-0" />
            {text}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="hero-pattern text-white pt-8 pb-10 md:pt-10 md:pb-12 overflow-x-hidden relative min-h-0 md:min-h-[58vh] flex items-center">
      <HeroOrderNotification />
      <div className="container mx-auto px-4 w-full">
        {/* Mobile: carousel below compact hero text */}
        <div className="md:hidden flex flex-col gap-6">
          <HeroLeftContent compact />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <HeroMobileCarousel />
          </motion.div>
        </div>

        {/* Tablet & desktop: two-column with orbit showcase */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-10 xl:gap-12 items-center">
          <HeroLeftContent />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.12 }}
            className="relative flex justify-center md:justify-end pb-2 w-full"
          >
            <HeroOrbitShowcase radius={200} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
