'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, CardContent, Badge, Input, Select } from '@mdh/ui';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';
import type { ProductDto, CategoryDto } from '@mdh/types';
import { FoodType } from '@mdh/types';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [foodType, setFoodType] = useState('');
  const addItem = useCartStore((s) => s.addItem);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<CategoryDto[]>('/categories?active=true'),
  });

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Our Menu</h1>

      <div className="flex flex-wrap gap-4 mb-8">
        <Input
          placeholder="Search dishes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={foodType} onChange={(e) => setFoodType(e.target.value)}>
          <option value="">All Types</option>
          <option value={FoodType.VEG}>Veg</option>
          <option value={FoodType.NON_VEG}>Non Veg</option>
        </Select>
      </div>

      {isLoading ? (
        <p>Loading menu...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.data.map((product) => (
            <Card key={product.id} className="flex flex-col">
              <Link href={`/menu/${product.slug}`}>
                <div className="h-44 bg-muted flex items-center justify-center text-5xl">🥞</div>
              </Link>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <Link href={`/menu/${product.slug}`}>
                    <h3 className="font-semibold hover:text-primary">{product.name}</h3>
                  </Link>
                  <Badge variant={product.foodType === 'VEG' ? 'success' : 'secondary'}>
                    {product.foodType === 'VEG' ? 'Veg' : 'Non Veg'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                  {product.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                  <Button
                    size="sm"
                    onClick={() => addItem(product)}
                    disabled={!product.isAvailable}
                  >
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
