export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl?: string | null;
}

const KEY = 'mdh_recently_viewed_v1';
const MAX = 8;
export const RECENTLY_VIEWED_EVENT = 'mdh-recently-viewed';

export function loadRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedItem[];
    return Array.isArray(parsed) ? parsed.filter((p) => p?.id && p?.slug) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentlyViewedItem) {
  if (typeof window === 'undefined') return;
  const next = [item, ...loadRecentlyViewed().filter((p) => p.id !== item.id)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
}
