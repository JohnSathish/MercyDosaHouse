export type SiteSeoConfig = {
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  defaultOgImage: string;
  canonicalDomain: string;
  googleVerification: string;
  cuisine: string;
  businessCategory: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  googleBusinessUrl: string;
  googleMapsUrl: string;
  facebookUrl: string;
  instagramUrl: string;
};

export const DEFAULT_SITE_SEO_CONFIG: SiteSeoConfig = {
  defaultTitle: 'Mercy Dosa House | South Indian Restaurant in Tura, Meghalaya',
  defaultDescription:
    'Mercy Dosa House in Tura, Meghalaya serves authentic South Indian food including crispy dosa, idli, vada and Chicken Dum Biryani. Order online for takeaway and home delivery.',
  defaultKeywords:
    'Mercy Dosa House, South Indian restaurant Tura, dosa Tura, idli Tura, vada Tura, Chicken Dum Biryani Tura, food delivery Tura',
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

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function httpsUrl(value: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function parseSiteSeoConfig(raw: unknown): SiteSeoConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const domain =
    httpsUrl(str(o.canonicalDomain, DEFAULT_SITE_SEO_CONFIG.canonicalDomain)).replace(/\/$/, '') ||
    DEFAULT_SITE_SEO_CONFIG.canonicalDomain;
  return {
    defaultTitle:
      str(o.defaultTitle, DEFAULT_SITE_SEO_CONFIG.defaultTitle) ||
      DEFAULT_SITE_SEO_CONFIG.defaultTitle,
    defaultDescription:
      str(o.defaultDescription, DEFAULT_SITE_SEO_CONFIG.defaultDescription) ||
      DEFAULT_SITE_SEO_CONFIG.defaultDescription,
    defaultKeywords: str(o.defaultKeywords, DEFAULT_SITE_SEO_CONFIG.defaultKeywords),
    defaultOgImage:
      str(o.defaultOgImage, DEFAULT_SITE_SEO_CONFIG.defaultOgImage) ||
      DEFAULT_SITE_SEO_CONFIG.defaultOgImage,
    canonicalDomain: domain,
    googleVerification: str(o.googleVerification, ''),
    cuisine: str(o.cuisine, DEFAULT_SITE_SEO_CONFIG.cuisine) || DEFAULT_SITE_SEO_CONFIG.cuisine,
    businessCategory:
      str(o.businessCategory, DEFAULT_SITE_SEO_CONFIG.businessCategory) ||
      DEFAULT_SITE_SEO_CONFIG.businessCategory,
    city: str(o.city, DEFAULT_SITE_SEO_CONFIG.city) || DEFAULT_SITE_SEO_CONFIG.city,
    region: str(o.region, DEFAULT_SITE_SEO_CONFIG.region) || DEFAULT_SITE_SEO_CONFIG.region,
    country: str(o.country, DEFAULT_SITE_SEO_CONFIG.country) || DEFAULT_SITE_SEO_CONFIG.country,
    postalCode: str(o.postalCode, ''),
    googleBusinessUrl: httpsUrl(str(o.googleBusinessUrl, '')),
    googleMapsUrl: httpsUrl(str(o.googleMapsUrl, '')),
    facebookUrl: httpsUrl(str(o.facebookUrl, '')),
    instagramUrl: httpsUrl(str(o.instagramUrl, '')),
  };
}
