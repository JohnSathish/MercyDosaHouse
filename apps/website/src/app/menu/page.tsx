import { Suspense } from 'react';
import { MenuPageClient } from '@/components/menu/menu-page-client';
import { MenuPageSkeleton } from '@/components/skeletons/menu-page-skeleton';
import { buildPageMetadata } from '@/lib/seo';
import { api } from '@/lib/api';
import type { ProductDto } from '@mdh/types';

export const generateMetadata = () => buildPageMetadata('menu', '/menu');

export default async function MenuPage() {
  let menuLd: Record<string, unknown> | null = null;
  try {
    const products = await api.get<{ data: ProductDto[] }>('/products?available=true&limit=100');
    const available = products.data.filter((p) => p.isAvailable && !p.isComingSoon);
    if (available.length) {
      menuLd = {
        '@context': 'https://schema.org',
        '@type': 'Menu',
        name: 'Mercy Dosa House menu',
        hasMenuItem: available.map((p) => ({
          '@type': 'MenuItem',
          name: p.name,
          description: p.description || undefined,
          offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR' },
        })),
      };
    }
  } catch {
    menuLd = null;
  }

  return (
    <>
      {menuLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(menuLd) }}
        />
      ) : null}
      <Suspense fallback={<MenuPageSkeleton />}>
        <MenuPageClient />
      </Suspense>
    </>
  );
}
