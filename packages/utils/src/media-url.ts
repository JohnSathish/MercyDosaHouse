const DEFAULT_SITE = 'https://mercydosahouse.com';

function siteOrigin(websiteOrigin?: string): string {
  const raw = (websiteOrigin || DEFAULT_SITE).trim() || DEFAULT_SITE;
  return raw.replace(/\/+$/, '');
}

/** Keep only the public uploads path so images are not bound to admin/localhost hosts. */
export function toStoredUploadPath(value: string): string {
  const raw = value.trim();
  const match = raw.match(/\/uploads\/[^\s?#]+/);
  if (match) return match[0];
  return raw;
}

/**
 * Resolve a media URL for display on website or admin.
 * Uploaded files always load from the customer website origin, not admin.mercydosahouse.com.
 */
export function resolvePublicMediaUrl(value?: string | null, websiteOrigin?: string): string {
  if (!value?.trim()) return '';
  const origin = siteOrigin(websiteOrigin);
  const stored = toStoredUploadPath(value);
  if (stored.startsWith('/uploads/')) return `${origin}${stored}`;
  if (stored.startsWith('uploads/')) return `${origin}/${stored}`;
  if (/^https?:\/\//i.test(stored)) return stored;
  if (stored.startsWith('/')) return `${origin}${stored}`;
  return `${origin}/${stored}`;
}
