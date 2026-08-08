/** Safe internal post-login redirect (blocks open redirects). */
export function getSafeRedirect(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export const CHECKOUT_LOGIN_REDIRECT = '/login?redirect=/checkout';

export function getCheckoutEntryHref(isLoggedIn: boolean): string {
  return isLoggedIn ? '/checkout' : CHECKOUT_LOGIN_REDIRECT;
}
