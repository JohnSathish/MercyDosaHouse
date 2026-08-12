'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@mdh/ui';
import { CATEGORY_IMAGES } from '@/lib/product-images';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import type { OfferDto } from '@mdh/types';

type OfferCard = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  bg: string;
  imageUrl?: string;
};

const OFFER_GRADIENTS = [
  'from-orange-500 to-amber-400',
  'from-emerald-600 to-green-500',
  'from-red-500 to-rose-500',
];

function cmsOffersToCards(offers: OfferDto[]): OfferCard[] {
  return offers.map((o, i) => ({
    title: o.title,
    subtitle: o.description ?? '',
    cta: o.buttonLabel ?? 'Order Now',
    href: o.buttonUrl ?? '/menu',
    bg: OFFER_GRADIENTS[i % OFFER_GRADIENTS.length],
    imageUrl: o.imageUrl ?? undefined,
  }));
}

export function OffersSection() {
  const cms = useCmsContent();
  if (!cms?.offers?.length) return null;
  const offers = cmsOffersToCards(cms.offers);
  return (
    <section id="offers" className="py-16 md:py-20 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
            🎁 Today&apos;s Specials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#14532D] mt-2">
            Special Deals For You
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 hidden md:grid">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden rounded-2xl ${offer.imageUrl ? 'bg-[#14532D]' : `bg-gradient-to-br ${offer.bg}`} text-white p-6 card-lift shadow-lg`}
            >
              {offer.imageUrl ? (
                <div className="absolute inset-0 opacity-40">
                  <Image src={offer.imageUrl} alt="" fill className="object-cover" />
                </div>
              ) : (
                <span className="text-2xl mb-3 block">🔥</span>
              )}
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1">{offer.title}</h3>
                <p className="text-white/90 text-sm mb-5">{offer.subtitle}</p>
                <Link href={offer.href}>
                  <Button
                    size="sm"
                    className="bg-white text-[#1F2937] hover:bg-white/90 font-semibold min-h-[44px] rounded-xl"
                  >
                    {offer.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: swipeable horizontal cards */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide md:hidden">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.title}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`snap-center shrink-0 w-[min(280px,82vw)] relative overflow-hidden rounded-3xl ${offer.imageUrl ? 'bg-[#14532D]' : `bg-gradient-to-br ${offer.bg}`} text-white p-5 shadow-lg active:scale-[0.98] transition-transform`}
            >
              {offer.imageUrl ? (
                <div className="relative h-28 -mx-5 -mt-5 mb-3 overflow-hidden rounded-t-3xl">
                  <Image src={offer.imageUrl} alt="" fill className="object-cover" />
                  <span className="absolute top-2 left-2 rounded-full bg-[#F59E0B] px-2 py-0.5 text-[10px] font-bold text-[#1F2937]">
                    Coming Soon
                  </span>
                </div>
              ) : (
                <span className="text-3xl mb-2 block">🔥</span>
              )}
              <h3 className="text-lg font-bold mb-1">{offer.title}</h3>
              <p className="text-white/90 text-sm mb-4">{offer.subtitle}</p>
              <Link href={offer.href}>
                <Button
                  size="sm"
                  className="bg-white text-[#1F2937] hover:bg-white/90 font-semibold min-h-[44px] rounded-xl w-full"
                >
                  {offer.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CATEGORIES = [
  { name: 'Dosa', slug: 'dosa', desc: '7 varieties', image: CATEGORY_IMAGES.dosa },
  { name: 'Biryani', slug: 'biryani', desc: 'Chicken special', image: CATEGORY_IMAGES.biryani },
  { name: 'Idli', slug: 'idly', desc: 'Soft & fluffy', image: CATEGORY_IMAGES.idly },
  { name: 'Vada', slug: 'vada', desc: 'Crispy golden', image: CATEGORY_IMAGES.vada },
  { name: 'Drinks', slug: '', desc: 'Coming soon', emoji: '🥤' },
];

export function CategoriesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-[#14532D] text-center mb-6 md:mb-10">
          Browse Categories
        </h2>

        {/* Mobile: horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide md:hidden">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="snap-start shrink-0"
            >
              <Link
                href={cat.slug ? `/menu?category=${cat.slug}` : '/menu?popular=true'}
                className="flex flex-col items-center justify-center w-[88px] h-[100px] bg-[#FFF8E8] rounded-3xl border border-[#14532D]/10 active:scale-95 transition-transform shadow-sm overflow-hidden"
              >
                {cat.image ? (
                  <div className="relative w-12 h-12 mb-1 rounded-full overflow-hidden ring-2 ring-[#14532D]/10">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <span className="text-3xl mb-1">{cat.emoji}</span>
                )}
                <span className="text-xs font-bold text-[#14532D]">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={cat.slug ? `/menu?category=${cat.slug}` : '/menu?popular=true'}
                className="block bg-[#FFF8E8] hover:bg-primary hover:text-white rounded-2xl p-6 text-center card-lift border border-[#14532D]/10 group transition-colors duration-300"
              >
                {cat.image ? (
                  <div className="relative w-20 h-20 mx-auto mb-3 rounded-2xl overflow-hidden ring-2 ring-[#14532D]/10 group-hover:ring-white/30 group-hover:scale-105 transition-transform">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">
                    {cat.emoji}
                  </span>
                )}
                <h3 className="font-bold text-lg">{cat.name}</h3>
                <p className="text-sm opacity-70 mt-1">{cat.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
