'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart } from 'react-icons/fi';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { getProductImage, productImageAlt } from '@/lib/product-images';
import type { ProductDto } from '@mdh/types';

interface ProductSliderCardProps {
  product: ProductDto;
  badge?: string;
  index?: number;
}

export function ProductSliderCard({ product, badge, index = 0 }: ProductSliderCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="snap-start shrink-0 w-[168px] sm:w-[180px] bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <Link href={`/menu/${product.slug}`} className="block relative">
        <div className="relative h-32 food-gradient overflow-hidden">
          <Image
            src={getProductImage(product)}
            alt={productImageAlt(product)}
            fill
            className="object-cover"
            sizes="180px"
          />
          {badge && (
            <span className="absolute top-2 left-2 bg-[#F59E0B] text-[#1F2937] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link href={`/menu/${product.slug}`}>
          <h3 className="font-bold text-sm text-[#1F2937] line-clamp-1">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between gap-1 mt-2">
          <p className="font-bold text-[#14532D]">{formatCurrency(product.price)}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 active:scale-95"
              aria-label="Favorite"
            >
              <FiHeart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => addItem(product)}
              disabled={!product.isAvailable}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14532D] text-white font-bold text-lg active:scale-95 disabled:opacity-50"
              aria-label="Add to cart"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HorizontalScrollRow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide scroll-smooth ${className}`}
    >
      {children}
    </div>
  );
}
