'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiClock, FiHome, FiCoffee } from 'react-icons/fi';
import { Button } from '@mdh/ui';
import { BRAND } from '@mdh/utils';
import { useCmsContent } from '@/components/cms/cms-content-provider';
import { getHeroContent } from '@/lib/cms-content';
import { getProductImage } from '@/lib/product-images';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import type { HeroSectionContent, ProductDto } from '@mdh/types';

const DEFAULT_HERO: HeroSectionContent = {
  badge: 'Authentic South Indian Flavours',
  title: BRAND.name,
  subtitle:
    'Freshly made South Indian food — crispy dosas, fluffy idlis & aromatic biryani in Tura.',
  ctaPrimary: { label: 'Order Now', href: '/menu' },
  ctaSecondary: { label: 'View Menu', href: '/menu' },
};

const BENEFIT_CHIPS = [
  { icon: FiHome, text: 'Home Delivery' },
  { icon: FiClock, text: 'Freshly Prepared' },
  { icon: FiCoffee, text: 'Quality Ingredients' },
];

function pickProduct(products: ProductDto[], slug: string) {
  return products.find((p) => p.slug === slug);
}

function HeroCtaButton({
  href,
  children,
  variant,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant: 'primary' | 'outline';
  onClick?: () => void;
}) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] focus-visible:ring-offset-2"
    >
      <Button
        size="lg"
        className={`relative min-h-[52px] rounded-2xl font-semibold px-8 transition-transform duration-200 group-hover:scale-[1.03] group-active:scale-[0.98] ${
          isPrimary
            ? 'btn-glow bg-[#F59E0B] text-[#1F2937] hover:bg-[#F59E0B]/90 shadow-lg shadow-[#F59E0B]/25'
            : 'border-2 border-[#14532D] bg-transparent text-[#14532D] hover:bg-[#14532D]/5'
        }`}
      >
        {children}
      </Button>
    </Link>
  );
}

function HeroFoodComposition({ products }: { products: ProductDto[] }) {
  const dosa = pickProduct(products, 'plain-dosa') ?? pickProduct(products, 'masala-dosa');
  const biryani = pickProduct(products, 'chicken-biryani');
  const side = pickProduct(products, 'idli-4-pieces') ?? pickProduct(products, 'vada-4-pieces');

  const plates = [
    {
      src: dosa ? getProductImage(dosa) : '/images/plain-dosa.png',
      alt: dosa?.name ?? 'Plain dosa',
      className: 'z-20 left-0 top-6 h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64',
      priority: true,
    },
    {
      src: biryani ? getProductImage(biryani) : '/images/chicken-biryani.png',
      alt: biryani?.name ?? 'Chicken Dum Biryani',
      className: 'z-30 right-0 top-0 h-44 w-44 sm:h-52 sm:w-52 md:h-60 md:w-60',
      priority: true,
    },
    {
      src: side ? getProductImage(side) : '/images/idli-4-pieces.png',
      alt: side?.name ?? 'Idli',
      className: 'z-10 bottom-0 left-1/4 h-32 w-32 sm:h-40 sm:w-40',
      priority: false,
    },
  ];

  return (
    <div className="relative mx-auto h-[320px] w-full max-w-[420px] sm:h-[380px] md:h-[420px]">
      {plates.map((plate) => (
        <motion.div
          key={plate.alt}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`absolute overflow-hidden rounded-full border-4 border-white bg-[#FFF8E8] shadow-xl ${plate.className}`}
        >
          <Image
            src={plate.src}
            alt={plate.alt}
            fill
            sizes="(max-width: 768px) 50vw, 280px"
            className="object-cover transition duration-500 hover:scale-105"
            priority={plate.priority}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function HeroSection({ products = [] }: { products?: ProductDto[] }) {
  const cms = useCmsContent();
  const marketing = useMarketing();
  const hero = (cms ? getHeroContent(cms) : null) ?? DEFAULT_HERO;
  const heroPromo = marketing?.byPlacement?.HERO_SECTION?.find((item) => !item.promotionProduct);

  function trackHeroClick(kind: 'primary' | 'secondary') {
    if (!heroPromo?.id) return;
    void trackMarketingEvent(heroPromo.id, 'cta_click', { surface: 'homepage_hero', kind });
  }

  return (
    <section className="relative overflow-hidden bg-[#FFF8E8] pt-6 pb-10 md:pt-10 md:pb-14">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F59E0B] sm:text-sm">
              {hero.badge || DEFAULT_HERO.badge}
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-[#14532D] md:text-5xl lg:text-6xl">
              {hero.title || DEFAULT_HERO.title}
            </h1>
            <p className="mb-6 max-w-lg text-base text-[#4B5563] md:text-lg">
              {hero.subtitle || DEFAULT_HERO.subtitle}
            </p>
            <div className="mb-6 flex flex-wrap gap-3">
              <HeroCtaButton
                href={hero.ctaPrimary?.href ?? '/menu'}
                variant="primary"
                onClick={() => trackHeroClick('primary')}
              >
                {hero.ctaPrimary?.label ?? 'Order Now'}
              </HeroCtaButton>
              <HeroCtaButton
                href={hero.ctaSecondary?.href ?? '/menu'}
                variant="outline"
                onClick={() => trackHeroClick('secondary')}
              >
                {hero.ctaSecondary?.label ?? 'View Menu'}
              </HeroCtaButton>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {BENEFIT_CHIPS.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-2 rounded-full border border-[#14532D]/10 bg-white px-3 py-2 text-xs font-medium text-[#14532D] sm:text-sm"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#F59E0B]" aria-hidden />
                  {text}
                </span>
              ))}
            </div>
          </motion.div>
          <HeroFoodComposition products={products} />
        </div>
      </div>
    </section>
  );
}
