import type { QueryClient } from '@tanstack/react-query';

/** User-scoped query keys — prevents showing another account's cached data after login/logout. */
export function userQueryKey(base: string, userId?: string | null) {
  return userId ? ([base, userId] as const) : ([base] as const);
}

const USER_SCOPED_KEYS = [
  'profile',
  'my-addresses',
  'checkout-profile',
  'my-orders',
  'my-favorites',
  'notifications',
] as const;

export function clearUserSessionQueries(queryClient: QueryClient) {
  for (const key of USER_SCOPED_KEYS) {
    queryClient.removeQueries({ queryKey: [key] });
  }
}
