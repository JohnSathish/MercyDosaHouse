import type { OfferDto } from '@mdh/types';
import { ANDROID_APP_URL } from '@mdh/utils';

export function androidAppUrl(override?: string | null) {
  const value = override?.trim();
  return value || ANDROID_APP_URL;
}

export function liveAppOnlyDiscountPct(offers: OfferDto[]): number | null {
  const now = Date.now();
  for (const offer of offers) {
    if (!offer.isActive) continue;
    if (offer.startsAt && new Date(offer.startsAt).getTime() > now) continue;
    if (offer.endsAt && new Date(offer.endsAt).getTime() < now) continue;
    const blob =
      `${offer.type} ${offer.title} ${offer.displayPosition ?? ''} ${offer.buttonUrl ?? ''} ${offer.description ?? ''}`.toLowerCase();
    const isAppOnly =
      blob.includes('android') ||
      blob.includes('app-only') ||
      blob.includes('app only') ||
      offer.type.toUpperCase() === 'APP' ||
      offer.type.toUpperCase() === 'ANDROID';
    if (isAppOnly && offer.discountPct != null && offer.discountPct > 0) {
      return offer.discountPct;
    }
  }
  return null;
}
