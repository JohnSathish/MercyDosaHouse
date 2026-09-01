import { BRAND } from '@mdh/utils';
import type { BusinessSettingsDto, ReviewSummaryDto, SiteSeoConfigDto } from '@mdh/types';
import { absoluteAsset, canonicalOrigin, canonicalUrl } from '@/lib/seo';

function socialList(settings: BusinessSettingsDto | null, seo: SiteSeoConfigDto) {
  const urls = [
    seo.googleBusinessUrl,
    seo.facebookUrl,
    seo.instagramUrl,
    settings?.socialLinks?.facebook,
    settings?.socialLinks?.instagram,
    settings?.socialLinks?.Facebook,
    settings?.socialLinks?.Instagram,
  ]
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter((u) => u && u !== '#');
  return [...new Set(urls)];
}

export function restaurantJsonLd(opts: {
  settings: BusinessSettingsDto | null;
  seo: SiteSeoConfigDto;
  rating?: ReviewSummaryDto | null;
  logoUrl?: string | null;
}) {
  const { settings, seo, rating, logoUrl } = opts;
  const name = settings?.businessName?.trim() || BRAND.name;
  const origin = canonicalOrigin(seo);
  const image = absoluteAsset(logoUrl || seo.defaultOgImage, seo);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'LocalBusiness'],
    name,
    url: `${origin}/`,
    telephone: settings?.phone || undefined,
    email: settings?.email || undefined,
    image,
    logo: image,
    priceRange: '₹',
    servesCuisine: [
      seo.cuisine,
      'Dosa',
      'Idli',
      'Vada',
      'South Indian Food',
      'Chicken Dum Biryani',
    ],
    menu: canonicalUrl('/menu', seo),
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings?.address || undefined,
      addressLocality: seo.city,
      addressRegion: seo.region,
      postalCode: seo.postalCode || undefined,
      addressCountry: seo.country,
    },
  };
  if (settings?.openingHours) schema.openingHours = settings.openingHours;
  const sameAs = socialList(settings, seo);
  if (sameAs.length) schema.sameAs = sameAs;
  if (seo.googleMapsUrl) schema.hasMap = seo.googleMapsUrl;
  if (rating && rating.totalReviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(rating.averageRating),
      reviewCount: String(rating.totalReviews),
    };
  }
  return schema;
}

export function organizationJsonLd(opts: {
  settings: BusinessSettingsDto | null;
  seo: SiteSeoConfigDto;
  logoUrl?: string | null;
}) {
  const { settings, seo, logoUrl } = opts;
  const name = settings?.businessName?.trim() || BRAND.name;
  const origin = canonicalOrigin(seo);
  const sameAs = socialList(settings, seo);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: `${origin}/`,
    logo: absoluteAsset(logoUrl || seo.defaultOgImage, seo),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
