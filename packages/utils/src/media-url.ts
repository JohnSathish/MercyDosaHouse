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
 * Uploads are served by the API so they are not swallowed by the Next.js 404 page.
 */
export function resolvePublicMediaUrl(value?: string | null, websiteOrigin?: string): string {
  if (!value?.trim()) return '';
  const origin = siteOrigin(websiteOrigin);
  const stored = toStoredUploadPath(value);
  if (stored.startsWith('/uploads/')) {
    const filename = stored.slice('/uploads/'.length);
    return `${origin}/api/v1/media/file/${encodeURIComponent(filename)}`;
  }
  if (stored.startsWith('uploads/')) {
    return `${origin}/api/v1/media/file/${encodeURIComponent(stored.slice('uploads/'.length))}`;
  }
  if (/^https?:\/\//i.test(stored)) return stored;
  if (stored.startsWith('/')) return `${origin}${stored}`;
  return `${origin}/${stored}`;
}
