'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { Star } from 'lucide-react';
import { HERO_MENU_ITEMS, HERO_DEFAULT_INDEX, type HeroMenuItem } from '@/lib/hero-menu-items';
import { HeroPriceCounter } from './hero-price-counter';
import { useMediaQuery } from '@/hooks/use-media-query';

const SWIPE_THRESHOLD = 40;
const AUTO_INTERVAL_MS = 4000;

function MobileSlide({ item, preload }: { item: HeroMenuItem; preload?: boolean }) {
  return (
    <div className="w-[95%] mx-auto">
      <Link href={`/menu/${item.slug}`} className="block group">
        <div className="relative">
          <motion.div
            className="absolute -inset-3 rounded-[2rem] blur-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${item.glowColor}44 0%, transparent 70%)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border-[3px] border-white/25 shadow-2xl">
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
              priority={preload}
              sizes="(max-width: 768px) 95vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {item.badge && (
              <motion.span
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-2.5 py-1 text-[10px] font-extrabold text-[#1F2937]"
              >
                🏆 {item.badge.toUpperCase()}
              </motion.span>
            )}
          </div>
          <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60">
                  {item.category}
                </p>
                <h3 className="text-xl font-bold">{item.name}</h3>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: item.glowColor }}>
                <HeroPriceCounter price={item.price} />
              </p>
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.floor(item.rating)
                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                      : 'fill-white/20 text-white/20'
                  }`}
                />
              ))}
              <span className="ml-1 text-sm text-white/80">{item.rating}</span>
            </div>
            <p className="text-sm text-white/75 mt-2 leading-relaxed">{item.description}</p>
            {item.extras && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.extras.map((e) => (
                  <span
                    key={e}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export function HeroMobileCarousel() {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [index, setIndex] = useState(HERO_DEFAULT_INDEX);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);

  const item = HERO_MENU_ITEMS[index];

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(next);
    },
    [index],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % HERO_MENU_ITEMS.length);
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + HERO_MENU_ITEMS.length) % HERO_MENU_ITEMS.length);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = setInterval(goNext, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, goNext]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD) goNext();
    else if (info.offset.y > SWIPE_THRESHOLD) goPrev();
  };

  const variants = {
    enter: (d: number) => ({ y: d > 0 ? 120 : -120, opacity: 0, scale: 0.94 }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ y: d > 0 ? -120 : 120, opacity: 0, scale: 0.94 }),
  };

  return (
    <div
      className="relative w-full"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 3000)}
    >
      <div className="relative overflow-hidden min-h-[440px]">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={item.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            drag={reducedMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            <MobileSlide item={item} preload={isMobile === true && item.featured} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Vertical progress dots */}
      <div className="flex justify-center gap-1.5 mt-4 flex-wrap px-4">
        {HERO_MENU_ITEMS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-[#F59E0B]' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Show ${m.name}`}
          />
        ))}
      </div>
    </div>
  );
}
