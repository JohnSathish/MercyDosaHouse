import { api } from '@/lib/api';
import type { MarketingPublicBundleDto } from '@mdh/types';

const EMPTY: MarketingPublicBundleDto = {
  version: 0,
  updatedAt: new Date().toISOString(),
  announcements: [],
  byPlacement: {},
  delivery: null,
};

let cache: { data: MarketingPublicBundleDto; expires: number } | null = null;

export async function getMarketingBundle(): Promise<MarketingPublicBundleDto> {
  if (cache && cache.expires > Date.now()) return cache.data;
  try {
    const data = await api.get<MarketingPublicBundleDto>('/marketing/public?platform=WEBSITE');
    cache = { data, expires: Date.now() + 60_000 };
    return data;
  } catch {
    return EMPTY;
  }
}

export function revalidateMarketingCache() {
  cache = null;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'mdh_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function trackMarketingEvent(
  announcementId: string,
  event: 'impression' | 'view' | 'dismiss' | 'cta_click' | 'conversion',
) {
  try {
    await api.post('/marketing/analytics/track', {
      announcementId,
      event,
      platform: 'WEBSITE',
    });
  } catch {
    /* non-blocking */
  }
}

export async function dismissAnnouncement(announcementId: string) {
  try {
    await api.post('/marketing/dismissals', {
      announcementId,
      sessionId: getSessionId(),
      platform: 'WEBSITE',
    });
  } catch {
    /* non-blocking */
  }
}

export async function checkDeliveryArea(address: string, pincode?: string) {
  try {
    const params = new URLSearchParams({ address });
    if (pincode) params.set('pincode', pincode.replace(/\D/g, '').slice(0, 6));
    return await api.get<{
      available: boolean;
      matchedArea?: string | null;
      status: string;
      message: string;
      expansionMessage?: string | null;
      orderWindow?: string | null;
      deliveryWindow?: string | null;
    }>(`/marketing/delivery/check?${params.toString()}`);
  } catch {
    return { available: true, status: 'AVAILABLE', message: 'Delivery check unavailable.' };
  }
}
