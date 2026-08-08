import type { OrderDto } from '@mdh/types';

export const LAST_ORDER_KEY = 'mdh_last_order';

export function saveLastOrder(order: OrderDto) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  }
}

export function loadLastOrder(): OrderDto | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(LAST_ORDER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrderDto;
  } catch {
    return null;
  }
}
