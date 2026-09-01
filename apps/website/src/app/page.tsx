import { api } from '@/lib/api';
import type { ProductDto, BusinessSettingsDto, ReviewSummaryDto } from '@mdh/types';
import { HomePageClient } from '@/components/home/home-page-client';
import { buildPageMetadata } from '@/lib/seo';

export const generateMetadata = () => buildPageMetadata('home', '/');

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
  const { products, settings } = await getHomeData();
  return <HomePageClient products={products} settings={settings} />;
}
