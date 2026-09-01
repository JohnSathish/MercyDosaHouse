import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { canonicalOrigin, getPublicSeo } from '@/lib/seo';
import type { ProductDto } from '@mdh/types';

const LOCAL = [
  '/south-indian-restaurant-tura',
  '/south-indian-food-tura',
  '/dosa-tura',
  '/idli-tura',
  '/vada-tura',
  '/chicken-dum-biryani-tura',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { config, pages } = await getPublicSeo();
  const origin = canonicalOrigin(config);
  const now = new Date();
  const staticPaths = [
    '/',
    '/menu',
    '/about',
    '/contact',
    '/gallery',
    '/offers',
    '/reviews',
    '/faq',
    '/privacy',
    '/fssai',
    ...LOCAL,
  ];
  const entries: MetadataRoute.Sitemap = staticPaths
    .filter((path) => {
      const key = path === '/' ? 'home' : path.replace(/^\//, '');
      const page = pages.find((p) => p.pageKey === key);
      return !page?.noIndex;
    })
    .map((path) => ({
      url: path === '/' ? `${origin}/` : `${origin}${path}`,
      lastModified: now,
      changeFrequency: path === '/' || path === '/menu' ? 'daily' : 'weekly',
      priority: path === '/' ? 1 : path === '/menu' ? 0.9 : 0.7,
    }));

  try {
    const products = await api.get<{ data: ProductDto[] }>('/products?limit=200');
    for (const product of products.data) {
      if (product.isComingSoon) continue;
      entries.push({
        url: `${origin}/menu/${product.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    /* sitemap still lists core pages */
  }

  return entries;
}
