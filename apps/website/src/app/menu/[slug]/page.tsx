'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Badge, Card, CardContent } from '@mdh/ui';
import { formatCurrency, SPICE_LEVEL_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';
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

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!product) return <div className="container mx-auto px-4 py-8">Product not found</div>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: product.name,
    description: product.description,
    offers: { '@type': 'Offer', price: product.price, priceCurrency: 'INR' },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/menu"
        className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block"
      >
        ← Back to Menu
      </Link>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-80 md:h-96 bg-muted rounded-lg flex items-center justify-center text-8xl">
          🥞
        </div>
        <div>
          <div className="flex gap-2 mb-2">
            <Badge variant={product.foodType === 'VEG' ? 'success' : 'secondary'}>
              {product.foodType === 'VEG' ? 'Veg' : 'Non Veg'}
            </Badge>
            <Badge variant="outline">{SPICE_LEVEL_LABELS[product.spiceLevel]}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">{product.name}</h1>
          <p className="text-2xl font-bold mb-4">{formatCurrency(product.price)}</p>
          <p className="text-muted-foreground mb-4">{product.description}</p>
          <p className="text-sm mb-4">⏱ Prep time: {product.prepTimeMinutes} mins</p>
          {product.ingredients && (
            <div className="mb-4">
              <h3 className="font-semibold mb-1">Ingredients</h3>
              <p className="text-sm text-muted-foreground">{product.ingredients}</p>
            </div>
          )}
          <Button size="lg" onClick={() => addItem(product)} disabled={!product.isAvailable}>
            Add to Cart — {formatCurrency(product.price)}
          </Button>
        </div>
      </div>
    </div>
  );
}
