'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiStar, FiClock, FiArrowLeft } from 'react-icons/fi';
import { Button, Badge } from '@mdh/ui';
import { formatCurrency, SPICE_LEVEL_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { getProductImage } from '@/lib/product-images';
import { useCartStore } from '@/lib/cart-store';
import { ProductDetailSkeleton } from '@/components/skeletons/product-detail-skeleton';
import type { ProductDto } from '@mdh/types';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<ProductDto>(`/products/slug/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="pt-24 pb-16 container mx-auto px-4 text-center">
        <span className="text-5xl mb-4 block">🍽️</span>
        <h1 className="text-2xl font-bold text-[#14532D] mb-2">Product not found</h1>
        <Link href="/menu" className="text-primary hover:underline">
          ← Back to Menu
        </Link>
      </div>
    );
  }

  const imageSrc = getProductImage(product);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: product.name,
    description: product.description,
    offers: { '@type': 'Offer', price: product.price, priceCurrency: 'INR' },
  };

  return (
    <div className="pt-4 lg:pt-24 pb-28 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Menu
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative h-72 md:h-[420px] rounded-2xl overflow-hidden food-gradient shadow-xl">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            {product.isPopular && (
              <span className="absolute top-4 left-4 bg-secondary text-[#1F2937] text-xs font-bold px-3 py-1 rounded-full">
                ⭐ Popular
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant={product.foodType === 'VEG' ? 'success' : 'secondary'}>
                {product.foodType === 'VEG' ? 'Veg' : 'Non Veg'}
              </Badge>
              <Badge variant="outline">{SPICE_LEVEL_LABELS[product.spiceLevel]}</Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-[#14532D] mb-2">{product.name}</h1>

            <div className="flex items-center gap-1 text-secondary mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <FiStar key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-gray-500 text-sm ml-1">(120 reviews)</span>
            </div>

            <p className="text-3xl font-bold text-primary mb-4">{formatCurrency(product.price)}</p>
            <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <FiClock className="w-4 h-4" />
              Prep time: {product.prepTimeMinutes} mins
            </div>

            {product.ingredients && (
              <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100">
                <h3 className="font-semibold text-[#14532D] mb-1">Ingredients</h3>
                <p className="text-sm text-gray-600">{product.ingredients}</p>
              </div>
            )}

            <Button
              size="lg"
              className="btn-glow bg-primary hover:bg-primary/90 font-semibold w-full sm:w-auto hidden lg:inline-flex"
              onClick={() => addItem(product)}
              disabled={!product.isAvailable}
            >
              Add to Cart — {formatCurrency(product.price)}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile sticky add to cart */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 safe-area-pb shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div>
            <p className="text-xs text-gray-500 line-clamp-1">{product.name}</p>
            <p className="text-lg font-bold text-[#14532D]">{formatCurrency(product.price)}</p>
          </div>
          <Button
            size="lg"
            className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] font-semibold active:scale-[0.98] transition-transform"
            onClick={() => addItem(product)}
            disabled={!product.isAvailable}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
