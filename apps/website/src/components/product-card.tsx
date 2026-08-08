'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiStar, FiHeart } from 'react-icons/fi';
import { Button, Badge } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { getProductImage } from '@/lib/product-images';
import type { ProductDto } from '@mdh/types';

interface ProductCardProps {
  product: ProductDto;
  badge?: string;
  soldCount?: number;
  index?: number;
}

export function ProductCard({ product, badge, soldCount, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-3xl overflow-hidden shadow-md card-lift border border-gray-100 group tap-active"
    >
      <Link href={`/menu/${product.slug}`} className="block relative">
        <div className="relative h-44 food-gradient overflow-hidden">
          <Image
            src={getProductImage(product)}
            alt={product.name}
            fill
            className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
          />
          {badge && (
            <span className="absolute top-3 left-3 bg-secondary text-[#1F2937] text-xs font-bold px-3 py-1 rounded-full">
              {badge}
            </span>
          )}
          {product.isPopular && !badge && (
            <span className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              Popular
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-1">
          <Link href={`/menu/${product.slug}`}>
            <h3 className="font-bold text-[#1F2937] group-hover:text-primary transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <button
            type="button"
            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
            aria-label="Favorite"
          >
            <FiHeart className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-secondary text-sm mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <FiStar key={i} className="w-3.5 h-3.5 fill-current" />
          ))}
          <span className="text-gray-500 ml-1">({soldCount ?? 120})</span>
        </div>
        <p className="text-lg font-bold text-primary mb-1">{formatCurrency(product.price)}</p>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.description}</p>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={product.foodType === 'VEG' ? 'success' : 'secondary'}>
            {product.foodType === 'VEG' ? 'Veg' : 'Non Veg'}
          </Badge>
          <Button
            size="sm"
            className="btn-glow bg-primary hover:bg-primary/90 font-semibold"
            onClick={() => addItem(product)}
            disabled={!product.isAvailable}
          >
            + Add to Cart
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-5 w-5 bg-gray-200 rounded-full" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3.5 w-3.5 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-6 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="flex justify-between pt-1">
          <div className="h-6 bg-gray-200 rounded-full w-12" />
          <div className="h-8 bg-gray-200 rounded-lg w-28" />
        </div>
      </div>
    </div>
  );
}
