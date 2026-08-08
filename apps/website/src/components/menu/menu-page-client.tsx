'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Input, Select } from '@mdh/ui';
import { api } from '@/lib/api';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import type { ProductDto, CategoryDto } from '@mdh/types';
import { FoodType } from '@mdh/types';

const CATEGORY_EMOJI: Record<string, string> = {
  dosa: '🥞',
  biryani: '🍛',
  idly: '🍽️',
  vada: '🍽️',
};

export function MenuPageClient() {
  const searchParams = useSearchParams();
  const initialCategorySlug = searchParams.get('category') ?? '';
  const showPopular = searchParams.get('popular') === 'true';

  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [foodType, setFoodType] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDto[]>('/categories?active=true'),
  });

  const categoryId = useMemo(() => {
    if (!categorySlug || !categories) return '';
    return categories.find((c) => c.slug === categorySlug)?.id ?? '';
  }, [categorySlug, categories]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', categoryId, foodType, search],
    queryFn: () => {
      const params = new URLSearchParams({ available: 'true' });
      if (categoryId) params.set('categoryId', categoryId);
      if (foodType) params.set('foodType', foodType);
      if (search) params.set('search', search);
      return api.get<{ data: ProductDto[] }>(`/products?${params}`);
    },
  });

  const filteredProducts = useMemo(() => {
    const list = products?.data ?? [];
    if (showPopular) return list.filter((p) => p.isPopular);
    return list;
  }, [products?.data, showPopular]);

  return (
    <div className="pt-4 lg:pt-24 pb-24 lg:pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
            Fresh & Hot
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-[#14532D] mt-1">Our Menu</h1>
          <p className="text-gray-500 mt-2">
            Authentic South Indian flavours — dosas, biryani, idly & more
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="search"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200 rounded-2xl h-12 text-base"
              autoFocus
            />
          </div>
          <Select
            value={foodType}
            onChange={(e) => setFoodType(e.target.value)}
            className="bg-white rounded-xl h-11 min-w-[140px]"
          >
            <option value="">All Types</option>
            <option value={FoodType.VEG}>Veg</option>
            <option value={FoodType.NON_VEG}>Non Veg</option>
          </Select>
        </div>

        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <button
              type="button"
              onClick={() => setCategorySlug('')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                !categorySlug && !showPopular
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-[#1F2937] border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategorySlug(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  categorySlug === cat.slug
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-[#1F2937] border border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {CATEGORY_EMOJI[cat.slug] ?? '🍽️'} {cat.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <span className="text-5xl mb-4 block">🍽️</span>
            <h3 className="text-xl font-bold text-[#14532D] mb-2">No dishes found</h3>
            <p className="text-gray-500">Try a different search or category</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  badge={
                    product.slug === 'masala-dosa'
                      ? '🏆 Best Seller'
                      : product.isPopular
                        ? '⭐ Popular'
                        : undefined
                  }
                  soldCount={product.slug === 'masala-dosa' ? 1200 : 80 + i * 15}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
