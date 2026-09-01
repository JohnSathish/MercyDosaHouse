'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@mdh/ui';
import {
  CHICKEN_BIRYANI_SLUG,
  formatCurrency,
  isChickenDumBiryaniProduct,
  productHomeBadge,
} from '@mdh/utils';
import { ProductCard } from '@/components/product-card';
import { ProductSliderCard, HorizontalScrollRow } from '@/components/mobile/product-slider-card';
import type { ProductDto } from '@mdh/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getProductImage } from '@/lib/product-images';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { trackMarketingEvent } from '@/lib/marketing-content';

export function HomeSearchStrip() {
  const router = useRouter();
  const [q, setQ] = useState('');

  return (
    <section className="py-6 md:py-8 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <form
          className="flex gap-2 max-w-xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            router.push(term ? `/menu?search=${encodeURIComponent(term)}` : '/menu');
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dosa, idli, biryani…"
            className="flex-1 rounded-xl border border-[#14532D]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F59E0B]/50"
            aria-label="Search menu"
          />
          <Button type="submit" className="bg-primary shrink-0">
            Search
          </Button>
        </form>
      </div>
    </section>
  );
}

export function CompactProductGrid({
  title,
  eyebrow,
  products,
  viewAllHref = '/menu',
}: {
  title: string;
  eyebrow?: string;
  products: ProductDto[];
  viewAllHref?: string;
}) {
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            {eyebrow ? (
              <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
                {eyebrow}
              </span>
            ) : null}
            <h2 className="text-2xl md:text-3xl font-bold text-[#14532D] mt-1">{title}</h2>
          </div>
          <Link href={viewAllHref}>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              View Full Menu
            </Button>
          </Link>
        </div>
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} badge={productHomeBadge(p)} index={i} />
          ))}
        </div>
        <HorizontalScrollRow className="md:hidden">
          {products.map((p, i) => (
            <ProductSliderCard key={p.id} product={p} badge={productHomeBadge(p)} index={i} />
          ))}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}

export function pickPopularFavourites(products: ProductDto[], limit = 5): ProductDto[] {
  const flagged = products.filter((p) => p.isPopular || p.isBestseller);
  const rest = products.filter((p) => !flagged.some((f) => f.id === p.id));
  return [...flagged, ...rest].slice(0, limit);
}

function FavouriteCard({ product, index }: { product: ProductDto; index: number }) {
  const marketing = useMarketing();
  const biryaniPromo = marketing?.announcements?.find(
    (item) =>
      item.promotionWebsiteEnabled !== false &&
      item.promotionProduct &&
      isChickenDumBiryaniProduct(item.promotionProduct),
  );
  const isBiryani = isChickenDumBiryaniProduct(product);
  const soldOut =
    !product.isAvailable ||
    (isBiryani &&
      biryaniPromo?.promotionRemainingQuantity != null &&
      biryaniPromo.promotionRemainingQuantity <= 0);
  const prebookHref =
    biryaniPromo && !soldOut
      ? biryaniPromo.ctaUrl?.trim() ||
        `/checkout?product=${encodeURIComponent(product.slug || CHICKEN_BIRYANI_SLUG)}&promotion=${encodeURIComponent(biryaniPromo.id)}&preorder=1`
      : `/checkout?product=${encodeURIComponent(product.slug || CHICKEN_BIRYANI_SLUG)}&preorder=1`;

  const href = isBiryani ? prebookHref : `/menu/${product.slug}`;
  const cta = isBiryani ? 'Pre-book Now' : 'Order Now';

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-[#14532D]/10 bg-white shadow-sm ${
        soldOut ? 'opacity-60' : ''
      }`}
    >
      <div className="relative h-40">
        <Image
          src={getProductImage(product)}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 70vw, 20vw"
          className="object-cover"
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#14532D] line-clamp-1">{product.name}</h3>
        <p className="mt-1 font-semibold text-[#1F2937]">{formatCurrency(product.price)}</p>
        <p className="mt-1 text-xs font-medium text-gray-500">
          {soldOut ? 'Currently unavailable' : 'Available'}
        </p>
        {soldOut ? (
          <span className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-500">
            Unavailable
          </span>
        ) : (
          <Link
            href={href}
            onClick={() => {
              if (isBiryani && biryaniPromo?.id) {
                void trackMarketingEvent(biryaniPromo.id, 'cta_click', {
                  surface: 'homepage_popular_favourites',
                });
              }
            }}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#F59E0B] px-3 text-sm font-bold text-[#1F2937] transition hover:bg-[#FBBF24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D]"
          >
            {cta}
          </Link>
        )}
      </div>
    </article>
  );
}

export function PopularFavouritesGrid({ products }: { products: ProductDto[] }) {
  if (!products.length) return null;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-secondary">
              From our kitchen
            </span>
            <h2 className="mt-1 text-2xl font-bold text-[#14532D] md:text-3xl">
              Our Popular Favourites
            </h2>
          </div>
          <Link href="/menu">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
            >
              View Full Menu
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p, i) => (
            <FavouriteCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SpecialtyTimelineSection({
  preOrder,
  comingSoon,
}: {
  preOrder: ProductDto[];
  comingSoon: ProductDto[];
}) {
  if (!preOrder.length && !comingSoon.length) return null;

  return (
    <section className="py-10 md:py-12 bg-white">
      <div className="container mx-auto px-4 space-y-10">
        {preOrder.length ? (
          <div>
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Schedule ahead
            </span>
            <h2 className="text-2xl font-bold text-[#14532D] mt-1 mb-5">Pre-Order</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {preOrder.map((p) => (
                <Link
                  key={p.id}
                  href={`/menu/${p.slug}`}
                  className="rounded-2xl border border-[#14532D]/10 bg-[#FFF8E8] p-4 hover:border-secondary/40 transition-colors"
                >
                  <p className="text-xs font-bold text-secondary uppercase">Pre-Order</p>
                  <p className="font-bold text-[#14532D] mt-1">{p.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatCurrency(p.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {comingSoon.length ? (
          <div>
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
              On the way
            </span>
            <h2 className="text-2xl font-bold text-[#14532D] mt-1 mb-5">Coming Soon</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {comingSoon.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-dashed border-[#14532D]/20 bg-white p-4 opacity-90"
                >
                  <p className="text-xs font-bold text-[#14532D]/70 uppercase">Coming Soon</p>
                  <p className="font-bold text-[#14532D] mt-1">{p.name}</p>
                  {p.description ? (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MenuPreviewSection({ products }: { products: ProductDto[] }) {
  if (!products.length) {
    return (
      <section className="py-12 bg-[#FFF8E8]">
        <div className="container mx-auto px-4 text-center">
          <Link href="/menu">
            <Button size="lg" className="bg-primary font-semibold">
              View Full Menu
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
              From our kitchen
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-[#14532D] mt-1">Menu Preview</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-lg">
              A short look at what&apos;s available — open the full menu for everything.
            </p>
          </div>
          <Link href="/menu">
            <Button className="bg-primary font-semibold">View Full Menu</Button>
          </Link>
        </div>
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} badge={productHomeBadge(p)} index={i} />
          ))}
        </div>
        <HorizontalScrollRow className="md:hidden">
          {products.map((p, i) => (
            <ProductSliderCard key={p.id} product={p} badge={productHomeBadge(p)} index={i} />
          ))}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}

/** @deprecated Kept for imports; homepage no longer uses these duplicate spotlights. */
export function PopularDosasSection({ products }: { products: ProductDto[] }) {
  return (
    <CompactProductGrid
      title="Popular Near You"
      eyebrow="Customer favourites"
      products={products.filter((p) => p.isPopular || p.isBestseller).slice(0, 4)}
    />
  );
}

export function BiryaniSection(_props: { product?: ProductDto }) {
  return null;
}

export function BestSellerSection(_props: { product?: ProductDto }) {
  return null;
}
