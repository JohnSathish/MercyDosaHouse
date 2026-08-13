import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import type { MarketingPublicBundleDto } from '@mdh/types';

const EMPTY: MarketingPublicBundleDto = {
  version: 0,
  updatedAt: new Date().toISOString(),
  announcements: [],
  byPlacement: {},
  delivery: null,
};

function resolveMarketingApiBase(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001/api/v1'
    );
  }
  return process.env.NEXT_PUBLIC_API_URL || `${APP_URLS.website}/api/v1`;
}

/** Always fetch fresh marketing config (admin edits must show without rebuild). */
export async function getMarketingBundle(): Promise<MarketingPublicBundleDto> {
  try {
    const base = resolveMarketingApiBase().replace(/\/$/, '');
    const res = await fetch(`${base}/marketing/public?platform=WEBSITE`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as MarketingPublicBundleDto;
  } catch {
    try {
      return await api.get<MarketingPublicBundleDto>('/marketing/public?platform=WEBSITE');
    } catch {
      return EMPTY;
    }
  }
}

export function revalidateMarketingCache() {
  /* no-op: marketing always fetched with cache: 'no-store' */
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
