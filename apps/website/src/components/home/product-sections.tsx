'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { getProductImage } from '@/lib/product-images';
import { ProductCard } from '@/components/product-card';
import { ProductSliderCard, HorizontalScrollRow } from '@/components/mobile/product-slider-card';
import type { ProductDto } from '@mdh/types';

export function PopularDosasSection({ products }: { products: ProductDto[] }) {
  const dosas = products
    .filter((p) => p.category?.slug === 'dosa' || p.slug.includes('dosa'))
    .slice(0, 4);

  return (
    <section className="py-16 md:py-20 bg-[#FFF8E8]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
              Customer Favourite
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#14532D] mt-1">Popular Items</h2>
          </div>
          <Link href="/menu">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-white"
            >
              View All
            </Button>
          </Link>
        </div>
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dosas.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              badge={i === 0 ? '🏆 Best Seller' : undefined}
              soldCount={i === 0 ? 1200 : 120 + i * 30}
              index={i}
            />
          ))}
        </div>
        <HorizontalScrollRow className="md:hidden">
          {dosas.map((p, i) => (
            <ProductSliderCard
              key={p.id}
              product={p}
              badge={i === 0 ? '🏆' : undefined}
              index={i}
            />
          ))}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}

export function BiryaniSection({ product }: { product?: ProductDto }) {
  if (!product) return null;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center bg-gradient-to-br from-[#14532D] to-[#1a6b3c] rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative h-64 lg:h-auto lg:min-h-[360px]">
            <Image
              src={getProductImage(product)}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-80"
            />
          </div>
          <div className="p-8 md:p-12 text-white">
            <span className="text-secondary font-semibold text-sm uppercase">
              Chef&apos;s Special
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-3">{product.name}</h2>
            <p className="text-white/85 mb-4 leading-relaxed">{product.description}</p>
            <p className="text-3xl font-bold text-secondary mb-6">
              {formatCurrency(product.price)}
            </p>
            <Link href={`/menu/${product.slug}`}>
              <Button
                size="lg"
                className="btn-glow bg-secondary text-[#1F2937] hover:bg-secondary/90 font-semibold"
              >
                Order Biryani
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BestSellerSection({ product }: { product?: ProductDto }) {
  if (!product) return null;

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8 bg-white rounded-3xl p-8 shadow-lg border border-secondary/20 card-lift">
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden food-gradient shrink-0">
            <Image
              src={getProductImage(product)}
              alt={product.name}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <span className="text-secondary font-bold text-sm">⭐ Best Seller</span>
            <h3 className="text-2xl font-bold text-[#14532D] mt-1">{product.name}</h3>
            <p className="text-gray-500 mt-1">1200+ Sold · {formatCurrency(product.price)}</p>
          </div>
          <Link href={`/menu/${product.slug}`}>
            <Button className="btn-glow bg-primary font-semibold shrink-0">Order Now</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
