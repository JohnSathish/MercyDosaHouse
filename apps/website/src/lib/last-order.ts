import type { OrderDto } from '@mdh/types';

export const LAST_ORDER_KEY = 'mdh_last_order';
const TRACK_TOKEN_PREFIX = 'mdh_track_token:';

export function saveLastOrder(order: OrderDto) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  if (order.trackToken && order.orderNumber) {
    sessionStorage.setItem(`${TRACK_TOKEN_PREFIX}${order.orderNumber}`, order.trackToken);
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

export function saveTrackToken(orderNumber: string, token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`${TRACK_TOKEN_PREFIX}${orderNumber}`, token);
}

export function loadTrackToken(orderNumber: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(`${TRACK_TOKEN_PREFIX}${orderNumber}`);
}
