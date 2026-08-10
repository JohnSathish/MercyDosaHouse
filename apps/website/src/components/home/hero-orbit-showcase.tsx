'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Star, Pause, Play } from 'lucide-react';
import { HERO_MENU_ITEMS, HERO_DEFAULT_INDEX, type HeroMenuItem } from '@/lib/hero-menu-items';
import { HeroPriceCounter } from './hero-price-counter';
import { useMediaQuery } from '@/hooks/use-media-query';

const AUTO_CYCLE_MS = 4000;
const STEP_DURATION_MS = 900;
const HOLD_MS = 600;
const FRONT_ANGLE = 90;

/** Round to whole pixels so SSR and client produce identical style strings */
function roundPx(n: number): number {
  return Math.round(n);
}

const SPICE_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  top: `${8 + ((i * 17) % 82)}%`,
  left: `${5 + ((i * 23) % 88)}%`,
  size: 2 + (i % 3),
  delay: (i * 0.35) % 3,
  duration: 5 + (i % 4),
}));

const FLOATING_INGREDIENTS = [
  { emoji: '🌿', top: '6%', left: '10%', duration: 9, drift: 12 },
  { emoji: '🌶', top: '12%', left: '90%', duration: 11, drift: -10 },
  { emoji: '🧄', top: '78%', left: '8%', duration: 10, drift: 8 },
  { emoji: '🧅', top: '82%', left: '92%', duration: 12, drift: -14 },
  { emoji: '🥥', top: '44%', left: '4%', duration: 13, drift: 6 },
  { emoji: '🌿', top: '52%', left: '96%', duration: 8, drift: -8 },
];

const ORBIT_RINGS = [
  { offset: 80, opacity: 0.12, dotCount: 6, speed: 1 },
  { offset: 40, opacity: 0.2, dotCount: 4, speed: -0.7 },
  { offset: 0, opacity: 0.28, dotCount: 3, speed: 1.3 },
];

type OrbitPhase = 'idle' | 'stepping' | 'holding';

const ITEM_COUNT = HERO_MENU_ITEMS.length;
const DEGREE_PER_ITEM = 360 / ITEM_COUNT;

/** Which item sits at the front (bottom) slot for a given rotation */
function getFrontIndex(rotation: number, n: number): number {
  const rot = ((rotation % 360) + 360) % 360;
  const idx = Math.round((rot / DEGREE_PER_ITEM) % n);
  return idx % n;
}

/** Snap rotation so item `index` is exactly at the front */
function snapRotationForIndex(index: number, n: number): number {
  return (index * DEGREE_PER_ITEM) % 360;
}

/** Nearest forward rotation target to bring `index` to front */
function targetRotationForIndex(current: number, index: number, n: number): number {
  const snap = snapRotationForIndex(index, n);
  const base = current - (((current % 360) + 360) % 360);
  let target = base + snap;
  if (target <= current + 0.5) target += 360;
  return target;
}

function getOrbitDepth(angleRad: number) {
  return (Math.sin(angleRad) + 1) / 2;
}

function getOrbitScale(depth: number, isApproaching: boolean) {
  if (isApproaching) return 1.12;
  if (depth > 0.82) return 1;
  if (depth < 0.18) return 0.75;
  return 0.85;
}

function getOrbitBlur(depth: number) {
  if (depth < 0.2) return 6;
  if (depth < 0.45) return 2;
  return 0;
}

function getOrbitOpacity(depth: number, isApproaching: boolean) {
  if (isApproaching) return 1;
  if (depth > 0.82) return 1;
  if (depth < 0.18) return 0.5;
  return 0.7;
}

function AnimatedStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 260, damping: 14 }}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              i < Math.floor(rating)
                ? 'fill-[#F59E0B] text-[#F59E0B]'
                : 'fill-white/20 text-white/20'
            }`}
          />
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="ml-1.5 text-sm font-semibold text-white/90"
      >
        {rating}
      </motion.span>
    </div>
  );
}

function BestSellerRibbon({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 16 }}
      className="absolute -top-3 -right-2 z-20"
    >
      <motion.span
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#1F2937] shadow-[0_4px_16px_rgba(245,158,11,0.5)]"
      >
        🏆 {label}
      </motion.span>
    </motion.div>
  );
}

function SteamEffect({ intensity = 1 }: { intensity?: number }) {
  const wisps = [
    { w: 2, h: 22, x: -14, delay: 0 },
    { w: 3, h: 28, x: -5, delay: 0.4 },
    { w: 2, h: 24, x: 5, delay: 0.8 },
    { w: 3, h: 30, x: 14, delay: 0.2 },
    { w: 2, h: 20, x: 0, delay: 1.1 },
  ];
  return (
    <div className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 pointer-events-none">
      {wisps.map((w, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-gradient-to-t from-white/0 via-white/30 to-white/60 blur-[1px]"
          style={{ width: w.w, left: w.x, height: w.h * intensity }}
          animate={{
            y: [0, -28 * intensity, -52 * intensity],
            opacity: [0, 0.55 * intensity, 0],
            scaleX: [1, 1.3, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.8,
            delay: w.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

function OrbitCard({
  item,
  x,
  y,
  scale,
  opacity,
  blur,
  zIndex,
  isApproaching,
  isAtFront,
  onSelect,
}: {
  item: HeroMenuItem;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  blur: number;
  zIndex: number;
  isApproaching: boolean;
  isAtFront: boolean;
  onSelect: () => void;
}) {
  if (isAtFront) return null;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      animate={{ x, y, scale, opacity, filter: `blur(${blur}px)` }}
      whileHover={{ scale: scale * 1.06, y: y - 4 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      style={{ zIndex }}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded-2xl group ${
        isApproaching ? 'shadow-[0_0_36px_rgba(245,158,11,0.65)]' : ''
      }`}
      aria-label={`View ${item.name}`}
    >
      <div
        className={`relative flex items-center gap-2 rounded-2xl px-2.5 py-2 border backdrop-blur-md transition-all duration-300 min-w-[130px] ${
          isApproaching
            ? 'bg-white border-white shadow-lg ring-2 ring-[#F59E0B]/50'
            : 'bg-white/95 border-white/80 shadow-[0_8px_28px_rgba(0,0,0,0.22)] group-hover:border-[#F59E0B]/40'
        }`}
      >
        {isApproaching && (
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-[#F59E0B]/60"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          />
        )}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-2 ring-white">
          <Image
            src={item.image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="40px"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 text-left flex-1">
          <p className="text-[10px] font-bold leading-tight text-[#1F2937] whitespace-nowrap truncate">
            {item.name}
          </p>
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-2 w-2 ${
                  i < Math.floor(item.rating)
                    ? 'fill-[#F59E0B] text-[#F59E0B]'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-extrabold text-[#14532D] group-hover:text-[#F59E0B] transition-colors">
            ₹{item.price}
          </p>
          {item.badge && (
            <p className="text-[8px] font-bold text-[#B45309] uppercase tracking-wide mt-0.5">
              {item.badge}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

const featuredVariants = {
  enter: {
    opacity: 0,
    scale: 1.05,
    y: 24,
    filter: 'blur(6px)',
  },
  center: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -12,
    filter: 'blur(8px)',
  },
};

function FeaturedCard({
  item,
  orbitTilt,
  preload,
}: {
  item: HeroMenuItem;
  orbitTilt: number;
  preload?: boolean;
}) {
  const steamIntensity = item.category === 'Biryani' || item.category === 'Breakfast' ? 1.3 : 1;

  return (
    <motion.div
      variants={featuredVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-30 w-full max-w-[300px] xl:max-w-[320px] mx-auto"
    >
      <Link href={`/menu/${item.slug}`} className="block group">
        <SteamEffect intensity={steamIntensity} />

        <motion.div
          animate={{
            y: [0, -5, 0],
            rotate: [-2 + orbitTilt * 0.3, 2 + orbitTilt * 0.3, -2 + orbitTilt * 0.3],
          }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="relative"
        >
          <motion.div
            key={`glow-${item.id}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute -inset-5 rounded-[2rem] blur-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${item.glowColor}66 0%, ${item.glowSecondary}28 50%, transparent 72%)`,
            }}
          />

          <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border-[3px] border-white/30 shadow-[0_24px_64px_rgba(0,0,0,0.45)] group-hover:border-white/50 transition-colors">
            <motion.div
              key={`img-${item.id}`}
              initial={{ opacity: 0, scale: 1.08, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full h-full"
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
                priority={preload}
                sizes="320px"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {item.badge && <BestSellerRibbon label={item.badge} />}
          </div>
        </motion.div>

        <motion.div
          key={`info-${item.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative -mt-6 mx-3 rounded-2xl bg-white/95 backdrop-blur-md px-4 py-3 shadow-xl border border-white/80 text-[#1F2937]"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#14532D]/60">
                {item.category}
              </p>
              <h3 className="text-lg font-bold text-[#14532D] leading-tight">{item.name}</h3>
            </div>
            <p className="text-xl font-extrabold shrink-0" style={{ color: item.glowColor }}>
              <HeroPriceCounter price={item.price} />
            </p>
          </div>
          <AnimatedStarRating rating={item.rating} />
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.description}</p>
          {item.extras && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {item.extras.map((extra) => (
                <li
                  key={extra}
                  className="rounded-full bg-[#14532D]/8 px-2 py-0.5 text-[10px] font-medium text-[#14532D]"
                >
                  {extra}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </Link>
    </motion.div>
  );
}

function OrbitRings({
  radius,
  rotation,
  mounted,
}: {
  radius: number;
  rotation: number;
  mounted: boolean;
}) {
  return (
    <>
      {ORBIT_RINGS.map((ring, ri) => {
        const size = radius * 2 + ring.offset;
        return (
          <div
            key={ri}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              width: size,
              height: size,
              border: `1px solid rgba(255,255,255,${ring.opacity})`,
            }}
          >
            {mounted &&
              Array.from({ length: ring.dotCount }).map((_, di) => {
                const angle = ((di / ring.dotCount) * 360 + rotation * ring.speed) % 360;
                const rad = (angle * Math.PI) / 180;
                const dotR = size / 2;
                const x = roundPx(Math.cos(rad) * dotR);
                const y = roundPx(Math.sin(rad) * dotR);
                return (
                  <motion.span
                    key={di}
                    className="absolute h-1 w-1 rounded-full bg-[#F59E0B]/70"
                    style={{ left: '50%', top: '50%', marginLeft: x - 2, marginTop: y - 2 }}
                    animate={{ opacity: [0.3, 0.9, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 + di * 0.3, delay: di * 0.2 }}
                  />
                );
              })}
          </div>
        );
      })}
    </>
  );
}

interface HeroOrbitShowcaseProps {
  radius?: number;
}

export function HeroOrbitShowcase({ radius = 200 }: HeroOrbitShowcaseProps) {
  const reducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mounted, setMounted] = useState(false);
  const [orbitRotation, setOrbitRotation] = useState(
    snapRotationForIndex(HERO_DEFAULT_INDEX, ITEM_COUNT),
  );
  const [paused, setPaused] = useState(false);
  const [orbitPhase, setOrbitPhase] = useState<OrbitPhase>('idle');

  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(orbitRotation);
  const phaseRef = useRef<OrbitPhase>('idle');
  const targetRef = useRef(orbitRotation);
  const stepStartRef = useRef(0);
  const stepFromRef = useRef(orbitRotation);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    rotationRef.current = orbitRotation;
  }, [orbitRotation]);

  useEffect(() => {
    phaseRef.current = orbitPhase;
  }, [orbitPhase]);

  /** Single source of truth — derived from rotation angle */
  const activeIndex = useMemo(() => getFrontIndex(orbitRotation, ITEM_COUNT), [orbitRotation]);
  const activeItem = HERO_MENU_ITEMS[activeIndex];
  const approachingIndex = (activeIndex + 1) % ITEM_COUNT;

  const beginStep = useCallback((toRotation: number) => {
    stepFromRef.current = rotationRef.current;
    targetRef.current = toRotation;
    stepStartRef.current = performance.now();
    setOrbitPhase('stepping');
    phaseRef.current = 'stepping';
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const target = targetRotationForIndex(rotationRef.current, index, ITEM_COUNT);
      beginStep(target);
    },
    [beginStep],
  );

  const goNext = useCallback(() => {
    beginStep(rotationRef.current + DEGREE_PER_ITEM);
  }, [beginStep]);

  const goPrev = useCallback(() => {
    beginStep(rotationRef.current - DEGREE_PER_ITEM);
  }, [beginStep]);

  // Auto-cycle: step → hold → step
  useEffect(() => {
    if (reducedMotion || paused) {
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
      return;
    }

    cycleTimerRef.current = setInterval(() => {
      if (phaseRef.current === 'idle') goNext();
    }, AUTO_CYCLE_MS);

    return () => {
      if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
    };
  }, [reducedMotion, paused, goNext]);

  // RAF: smooth rotation stepping + subtle drift while idle
  useEffect(() => {
    if (reducedMotion) return;
    let raf: number;

    const tick = (now: number) => {
      if (paused) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const phase = phaseRef.current;

      if (phase === 'stepping') {
        const elapsed = now - stepStartRef.current;
        const t = Math.min(elapsed / STEP_DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = stepFromRef.current + (targetRef.current - stepFromRef.current) * eased;
        rotationRef.current = next;
        setOrbitRotation(next);

        if (t >= 1) {
          setOrbitPhase('holding');
          phaseRef.current = 'holding';
          setTimeout(() => {
            setOrbitPhase('idle');
            phaseRef.current = 'idle';
          }, HOLD_MS);
        }
      } else if (phase === 'idle') {
        const idx = getFrontIndex(rotationRef.current, ITEM_COUNT);
        const fullTurns = Math.floor(rotationRef.current / 360) * 360;
        const snap = fullTurns + snapRotationForIndex(idx, ITEM_COUNT);
        const wobble = Math.sin(now / 2500) * 1.5;
        const next = snap + wobble;
        rotationRef.current = next;
        setOrbitRotation(next);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, paused]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  const orbitTilt = useMemo(() => {
    const delta = orbitRotation - snapRotationForIndex(activeIndex, ITEM_COUNT);
    return Math.max(-2, Math.min(2, delta * 0.08));
  }, [orbitRotation, activeIndex]);

  const orbitPositions = useMemo(() => {
    return HERO_MENU_ITEMS.map((item, i) => {
      const angleDeg = (i / ITEM_COUNT) * 360 - orbitRotation + FRONT_ANGLE;
      const angleRad = (angleDeg * Math.PI) / 180;
      const depth = getOrbitDepth(angleRad);
      const isAtFront = i === activeIndex && depth > 0.72;
      const isApproaching = i === approachingIndex && depth > 0.45 && depth < 0.88;

      return {
        item,
        index: i,
        x: roundPx(Math.cos(angleRad) * radius),
        y: roundPx(Math.sin(angleRad) * radius * 0.88),
        depth,
        scale: getOrbitScale(depth, isApproaching),
        opacity: getOrbitOpacity(depth, isApproaching),
        blur: getOrbitBlur(depth),
        zIndex: Math.round(5 + depth * 25 + (isApproaching ? 10 : 0)),
        isAtFront,
        isApproaching,
      };
    });
  }, [orbitRotation, radius, activeIndex, approachingIndex]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Featured menu showcase"
      aria-live="polite"
      className="relative w-full max-w-[560px] xl:max-w-[600px] mx-auto aspect-square outline-none"
      style={{ perspective: '900px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`ambient-${activeItem.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-[5%] pointer-events-none"
        >
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${activeItem.glowColor}66 0%, ${activeItem.glowSecondary}22 45%, transparent 70%)`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      <OrbitRings radius={radius} rotation={orbitRotation} mounted={mounted} />

      {mounted &&
        !reducedMotion &&
        FLOATING_INGREDIENTS.map((ing, i) => (
          <motion.span
            key={i}
            className="absolute text-lg opacity-[0.18] pointer-events-none select-none"
            style={{ top: ing.top, left: ing.left }}
            animate={{ y: [0, ing.drift, 0], x: [0, ing.drift * 0.4, 0], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: ing.duration, ease: 'easeInOut' }}
          >
            {ing.emoji}
          </motion.span>
        ))}

      {mounted &&
        !reducedMotion &&
        SPICE_PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-amber-300/50 pointer-events-none"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
            animate={{ opacity: [0.15, 0.6, 0.15], y: [0, -14, 0], x: [0, i % 2 ? 4 : -4, 0] }}
            transition={{ repeat: Infinity, duration: p.duration, delay: p.delay }}
          />
        ))}

      {orbitPositions.map(
        ({ item, index, x, y, scale, opacity, blur, zIndex, isAtFront, isApproaching }) => (
          <OrbitCard
            key={item.id}
            item={item}
            x={x}
            y={y}
            scale={scale}
            opacity={opacity}
            blur={blur}
            zIndex={zIndex}
            isApproaching={isApproaching}
            isAtFront={isAtFront}
            onSelect={() => goTo(index)}
          />
        ),
      )}

      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[52%]">
        <AnimatePresence mode="wait">
          <FeaturedCard
            key={activeItem.id}
            item={activeItem}
            orbitTilt={orbitTilt}
            preload={isDesktop === true}
          />
        </AnimatePresence>
      </div>

      {!reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute bottom-0 right-0 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 transition-colors"
          aria-label={paused ? 'Play animation' : 'Pause animation'}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
