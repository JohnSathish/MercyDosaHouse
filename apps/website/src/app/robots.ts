import type { MetadataRoute } from 'next';
import { canonicalOrigin, getPublicSeo } from '@/lib/seo';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { config } = await getPublicSeo();
  const base = canonicalOrigin(config);
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/checkout',
        '/cart',
        '/profile',
        '/dashboard',
        '/admin',
        '/account',
        '/api/',
        '/login',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
