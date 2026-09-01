/** CORS origins for HTTP and Socket.IO — always include live Admin + website in production. */
const PRODUCTION_ORIGINS = [
  'https://mercydosahouse.com',
  'https://www.mercydosahouse.com',
  'https://admin.mercydosahouse.com',
];

export function getAllowedCorsOrigins(): string[] | true {
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production' && extra.length === 0) {
    return true;
  }

  const merged = [
    ...PRODUCTION_ORIGINS,
    ...extra,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    process.env.NEXT_PUBLIC_WEBSITE_URL,
  ]
    .filter(Boolean)
    .map((o) => o!.replace(/\/$/, ''));

  return [...new Set(merged)];
}

export function getWebSocketCorsConfig(): { origin: string[] | boolean; credentials: boolean } {
  return { origin: getAllowedCorsOrigins(), credentials: true };
}
