/** Safe internal post-login redirect (blocks open redirects). */
export function getSafeRedirect(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}

export const CHECKOUT_PATH = '/checkout';

export function getCheckoutEntryHref(_isLoggedIn?: boolean): string {
  return CHECKOUT_PATH;
}
