import type { BusinessSettingsDto, ReviewSummaryDto, SiteSeoConfigDto } from '@mdh/types';
import { organizationJsonLd, restaurantJsonLd } from '@/lib/json-ld';

export function RestaurantJsonLd({
  settings,
  seo,
  rating,
  logoUrl,
}: {
  settings: BusinessSettingsDto | null;
  seo: SiteSeoConfigDto;
  rating?: ReviewSummaryDto | null;
  logoUrl?: string | null;
}) {
  const restaurant = restaurantJsonLd({ settings, seo, rating, logoUrl });
  const organization = organizationJsonLd({ settings, seo, logoUrl });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurant) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}
