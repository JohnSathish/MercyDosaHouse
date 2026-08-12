'use client';

import Link from 'next/link';
import { Button } from '@mdh/ui';
import { formatCurrency, productHomeBadge } from '@mdh/utils';
import { ProductCard } from '@/components/product-card';
import { ProductSliderCard, HorizontalScrollRow } from '@/components/mobile/product-slider-card';
import type { ProductDto } from '@mdh/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
