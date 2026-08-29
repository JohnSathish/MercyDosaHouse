import { api } from '@/lib/api';
import { BRAND } from '@mdh/utils';
import type { ProductDto, BusinessSettingsDto } from '@mdh/types';
import { HomePageClient } from '@/components/home/home-page-client';

async function getHomeData() {
  try {
    const result = await Promise.race([
      Promise.all([
        api.get<{ data: ProductDto[] }>('/products?limit=50'),
        api.get<BusinessSettingsDto>('/settings/business'),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!result) return { products: [], settings: null };
    const [products, settings] = result;
    return { products: products.data, settings };
  } catch {
    return { products: [], settings: null };
  }
}

export default async function HomePage() {
  const { products, settings } = await getHomeData();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: BRAND.name,
    description: BRAND.tagline,
    servesCuisine: 'South Indian',
    priceRange: '₹',
    telephone: settings?.phone,
    address: settings?.address,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '500',
    },
  };

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
