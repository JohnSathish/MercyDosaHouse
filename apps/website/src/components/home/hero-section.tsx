'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { BRAND, isChickenDumBiryaniProduct } from '@mdh/utils';
import { getProductImage, productImageAlt } from '@/lib/product-images';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';
import type { HeroSectionContent, ProductDto } from '@mdh/types';

const DEFAULT_HERO: HeroSectionContent = {
  badge: 'Authentic South Indian Flavours',
  title: BRAND.name,
  subtitle:
    'Crispy dosas. Fluffy idlis.\nAromatic biryani.\nFreshly prepared with quality ingredients and a whole lot of love.',
  ctaPrimary: { label: 'Order Now', href: '/menu' },
  ctaSecondary: { label: 'View Menu', href: '/menu' },
};

function pick(products: ProductDto[], slugs: string[]) {
  for (const slug of slugs) {
    const found = products.find((p) => p.slug === slug);
    if (found) return found;
  }
  return products.find((p) => !isChickenDumBiryaniProduct(p)) ?? products[0];
}

function HeroFoodComposition({ products }: { products: ProductDto[] }) {
  const dosa =
    pick(products, ['ghee-roast-dosa', 'masala-dosa', 'plain-dosa', 'mysore-masala-dosa']) ?? null;
  const biryani = products.find((p) => isChickenDumBiryaniProduct(p)) ?? null;
  const idli = pick(products, ['idli-4-pieces', 'vada-4-pieces']);
  const vada = products.find((p) => p.slug === 'vada-4-pieces' && p.id !== idli?.id) ?? idli;

  const dosaSrc = dosa ? getProductImage(dosa) : '/images/hero-dosa.png';
  const biryaniSrc = biryani ? getProductImage(biryani) : '/images/chicken-biryani.png';
  const idliSrc = idli ? getProductImage(idli) : '/images/idli-4-pieces.png';
  const vadaSrc = vada ? getProductImage(vada) : '/images/vada-4-pieces.png';

  return (
    <div className="relative mx-auto h-[340px] w-full max-w-[560px] sm:h-[420px] lg:h-[500px]">
      <div className="absolute left-[4%] top-[8%] z-20 h-[58%] w-[78%] overflow-hidden rounded-[2.5rem] border-[6px] border-white shadow-[0_24px_50px_rgba(11,84,47,0.18)] sm:rounded-[3rem]">
        <Image
          src={dosaSrc}
          alt={dosa ? productImageAlt(dosa) : 'Mercy Dosa House crispy dosa'}
          fill
          priority
          sizes="(max-width: 1024px) 90vw, 480px"
          className="object-cover object-center"
          unoptimized
        />
      </div>
      <div className="absolute bottom-[2%] right-[2%] z-30 h-[52%] w-[52%] overflow-hidden rounded-full border-[6px] border-white shadow-[0_20px_40px_rgba(11,84,47,0.2)]">
        <Image
          src={biryaniSrc}
          alt={biryani ? productImageAlt(biryani) : 'Mercy Dosa House chicken dum biryani'}
          fill
          priority
          sizes="(max-width: 1024px) 50vw, 280px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="absolute bottom-[10%] left-[6%] z-10 h-[22%] w-[22%] overflow-hidden rounded-full border-4 border-white shadow-lg">
        <Image
          src={idliSrc}
          alt={idli ? productImageAlt(idli) : 'Mercy Dosa House idli'}
          fill
          sizes="120px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="absolute right-[38%] bottom-[4%] z-20 h-[16%] w-[16%] overflow-hidden rounded-full border-4 border-white shadow-md">
        <Image
          src={vadaSrc}
          alt={vada ? productImageAlt(vada) : 'Mercy Dosa House vada'}
          fill
          sizes="90px"
          className="object-cover"
          unoptimized
        />
      </div>
    </div>
  );
}

export function HeroSection({ products = [] }: { products?: ProductDto[] }) {
  const marketing = useMarketing();
  const heroPromo = marketing?.byPlacement?.HERO_SECTION?.find((item) => !item.promotionProduct);
  const title = DEFAULT_HERO.title || BRAND.name;
  const [first, ...rest] = title.split(' ');
  const second = rest.join(' ');

  function trackHeroClick(kind: 'primary' | 'secondary') {
    if (!heroPromo?.id) return;
    void trackMarketingEvent(heroPromo.id, 'cta_click', { surface: 'homepage_hero', kind });
  }

  return (
    <section className="relative overflow-hidden bg-[#FFF8E8] pb-8 pt-4 md:pb-12 md:pt-6">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5A000] sm:text-xs">
              {DEFAULT_HERO.badge}
            </p>
            <h1
              aria-label={title}
              className="font-[family-name:var(--font-poppins)] text-5xl font-black leading-[0.92] tracking-tight text-[#0B542F] sm:text-6xl lg:text-[4.5rem]"
            >
              <span className="block text-[#0B542F]">{first}</span>
              {second ? <span className="block text-[#064728]">{second}</span> : null}
            </h1>
            <p className="mt-5 max-w-md whitespace-pre-line text-base leading-relaxed text-[#18352A]/80 sm:text-lg">
              {DEFAULT_HERO.subtitle}
            </p>
            <p className="mt-3 text-sm font-semibold text-[#0B542F]">
              Fresh South Indian food, delivered in Tura, Meghalaya.
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-sm font-semibold text-[#0B542F]">
              {['Freshly Prepared', 'Quality Ingredients', 'Home Delivery'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B542F] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={DEFAULT_HERO.ctaPrimary?.href ?? '/menu'}
                onClick={() => trackHeroClick('primary')}
                className="inline-flex min-h-12 items-center rounded-full bg-[#F5A000] px-8 text-sm font-black uppercase tracking-wide text-[#18352A] shadow-md shadow-[#F5A000]/30"
              >
                {DEFAULT_HERO.ctaPrimary?.label ?? 'Order Now'}
              </Link>
              <Link
                href={DEFAULT_HERO.ctaSecondary?.href ?? '/menu'}
                onClick={() => trackHeroClick('secondary')}
                className="inline-flex min-h-12 items-center rounded-full border-2 border-[#0B542F] px-8 text-sm font-black uppercase tracking-wide text-[#0B542F]"
              >
                {DEFAULT_HERO.ctaSecondary?.label ?? 'View Menu'}
              </Link>
            </div>
          </div>
          <HeroFoodComposition products={products} />
        </div>
      </div>
    </section>
  );
}
