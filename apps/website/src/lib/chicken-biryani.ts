import type { ProductDto } from '@mdh/types';
import {
  CHICKEN_BIRYANI_SLUG,
  CHICKEN_BIRYANI_SLUG_ALIASES,
  isChickenDumBiryaniProduct,
  nextPromotionDate,
} from '@mdh/utils';
import { api } from '@/lib/api';

export async function fetchChickenDumBiryaniProduct(): Promise<ProductDto | null> {
  for (const slug of CHICKEN_BIRYANI_SLUG_ALIASES) {
    try {
      const product = await api.get<ProductDto>(`/products/slug/${slug}`);
      if (product?.id) return product;
    } catch {
      /* try next alias */
    }
  }
  try {
    const page = await api.get<{ data: ProductDto[] }>('/products?limit=200');
    return page.data.find((item) => isChickenDumBiryaniProduct(item)) ?? null;
  } catch {
    return null;
  }
}

export function parseBiryaniInclusions(source: string): { emoji: string; label: string }[] {
  const text = source.toLowerCase();
  if (!text.trim()) return [];
  const items: { emoji: string; label: string }[] = [];
  const rules: { match: RegExp; emoji: string; label: string }[] = [
    { match: /boiled egg|\begg\b/, emoji: '🥚', label: '1 Boiled Egg' },
    { match: /chicken gravy|\bgravy\b/, emoji: '🍗', label: 'Chicken Gravy' },
    { match: /onion raita|\braita\b/, emoji: '🥣', label: 'Onion Raita' },
    { match: /rava kesari|\bkesari\b/, emoji: '🍮', label: 'Rava Kesari' },
  ];
  for (const rule of rules) {
    if (rule.match.test(text)) items.push({ emoji: rule.emoji, label: rule.label });
  }
  return items;
}

export function formatSundayLong(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function nextBiryaniSunday(opts: {
  dayOfWeek?: number | null;
  readyTime?: string | null;
  preOrderRequired?: boolean;
  preOrderCutoffDay?: number | null;
}) {
  return nextPromotionDate({
    dayOfWeek: opts.dayOfWeek ?? 0,
    readyTime: opts.readyTime ?? '13:00',
    preOrderRequired: opts.preOrderRequired ?? true,
    preOrderCutoffDay: opts.preOrderCutoffDay ?? 6,
  });
}

export const CANONICAL_BIRYANI_SLUG = CHICKEN_BIRYANI_SLUG;
