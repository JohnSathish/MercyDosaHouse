import { BRAND } from '@mdh/utils';
import { APP_URLS } from '@/lib/app-urls';

interface RestaurantJsonLdProps {
  phone?: string | null;
  address?: string | null;
  hours?: string | null;
}

export function RestaurantJsonLd({ phone, address, hours }: RestaurantJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: BRAND.name,
    description: BRAND.tagline,
    url: APP_URLS.website,
    telephone: phone || undefined,
    address: address
      ? {
          '@type': 'PostalAddress',
          streetAddress: address,
          addressLocality: 'Tura',
          addressRegion: 'Meghalaya',
          addressCountry: 'IN',
        }
      : undefined,
    servesCuisine: ['South Indian', 'Indian'],
    priceRange: '₹₹',
    openingHours: hours || undefined,
    image: `${APP_URLS.website}/images/logo.png`,
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
