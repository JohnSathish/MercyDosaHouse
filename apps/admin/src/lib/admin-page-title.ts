import { ADMIN_NAV } from './admin-nav';

/** Resolve a human-readable page title from the current pathname. */
export function getAdminPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/login') return 'Login';

  const match = [...ADMIN_NAV]
    .filter((item) => item.href !== '/')
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return match?.label ?? 'Admin';
}
