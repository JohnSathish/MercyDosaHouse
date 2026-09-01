import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import type { SeoMetadataDto, SiteSeoConfigDto } from '@mdh/types';
import { BRAND } from '@mdh/utils';

const FALLBACK_CONFIG: SiteSeoConfigDto = {
  defaultTitle: 'Mercy Dosa House | South Indian Restaurant in Tura, Meghalaya',
  defaultDescription:
    'Mercy Dosa House in Tura, Meghalaya serves authentic South Indian food including crispy dosa, idli, vada and Chicken Dum Biryani. Order online for takeaway and home delivery.',
  defaultKeywords:
    'Mercy Dosa House, South Indian restaurant Tura, dosa Tura, idli Tura, vada Tura, Chicken Dum Biryani Tura',
  defaultOgImage: '/images/logo.png',
  canonicalDomain: 'https://mercydosahouse.com',
  googleVerification: '',
  cuisine: 'South Indian',
  businessCategory: 'Restaurant',
  city: 'Tura',
  region: 'Meghalaya',
  country: 'IN',
  postalCode: '',
  googleBusinessUrl: '',
  googleMapsUrl: '',
  facebookUrl: '',
  instagramUrl: '',
};

let cache: { config: SiteSeoConfigDto; pages: SeoMetadataDto[]; expires: number } | null = null;

export function canonicalOrigin(config?: SiteSeoConfigDto | null) {
  const raw = config?.canonicalDomain || APP_URLS.website || 'https://mercydosahouse.com';
  return raw.replace(/\/$/, '');
}

export function canonicalUrl(path: string, config?: SiteSeoConfigDto | null) {
  const origin = canonicalOrigin(config);
  if (!path || path === '/') return `${origin}/`;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getPublicSeo() {
  if (cache && cache.expires > Date.now()) return cache;
  try {
    const [config, pagesRes] = await Promise.all([
      api.get<SiteSeoConfigDto>('/settings/seo-config'),
      api.get<{ pages: SeoMetadataDto[] }>('/cms/seo/public'),
    ]);
    cache = {
      config: config ?? FALLBACK_CONFIG,
      pages: pagesRes?.pages ?? [],
      expires: Date.now() + 60_000,
    };
    return cache;
  } catch {
    return { config: FALLBACK_CONFIG, pages: [] as SeoMetadataDto[], expires: 0 };
  }
}

export function pageSeo(pages: SeoMetadataDto[], pageKey: string) {
  return pages.find((p) => p.pageKey === pageKey);
}

export function absoluteAsset(url: string | null | undefined, config?: SiteSeoConfigDto | null) {
  if (!url) return canonicalUrl('/images/logo.png', config);
  if (url.startsWith('http')) return url;
  return `${canonicalOrigin(config)}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function buildPageMetadata(
  pageKey: string,
  path: string,
  fallback?: { title?: string; description?: string },
): Promise<Metadata> {
  const { config, pages } = await getPublicSeo();
  const entry = pageSeo(pages, pageKey);
  const title = entry?.metaTitle || fallback?.title || config.defaultTitle;
  const description = entry?.metaDescription || fallback?.description || config.defaultDescription;
  const url = entry?.canonicalUrl || canonicalUrl(path, config);
  const image = absoluteAsset(entry?.ogImage || config.defaultOgImage, config);
  const index = entry?.noIndex ? false : true;
  const follow = entry?.noFollow ? false : true;
  const titleField = pageKey === 'home' ? { absolute: title } : title;
  return {
    title: titleField,
    description,
    keywords: entry?.keywords || config.defaultKeywords,
    alternates: { canonical: url },
    robots: { index, follow },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'en_IN',
      siteName: BRAND.name,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
