import { api } from '@/lib/api';
import { BRAND } from '@mdh/utils';
import type { ProductDto, BusinessSettingsDto, ReviewSummaryDto } from '@mdh/types';
import { HomePageClient } from '@/components/home/home-page-client';

async function getHomeData() {
  try {
    const result = await Promise.race([
      Promise.all([
        api.get<{ data: ProductDto[] }>('/products?limit=50'),
        api.get<BusinessSettingsDto>('/settings/business'),
        api.get<ReviewSummaryDto>('/reviews/summary'),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!result) return { products: [], settings: null, rating: null };
    const [products, settings, rating] = result;
    return { products: products.data, settings, rating };
  } catch {
    return { products: [], settings: null, rating: null };
  }
}

export default async function HomePage() {
  const { products, settings, rating } = await getHomeData();

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: BRAND.name,
    description: BRAND.tagline,
    servesCuisine: 'South Indian',
    priceRange: '₹',
    telephone: settings?.phone,
    address: settings?.address,
  };
  if (rating && rating.totalReviews > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(rating.averageRating),
      reviewCount: String(rating.totalReviews),
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient products={products} settings={settings} />
    </>
  );
}
