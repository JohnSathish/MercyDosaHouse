const DEFAULT_WEBSITE = 'https://mercydosahouse.com';
const DEFAULT_LOGO_PATH = '/images/logo.png';

export function formatFromHeader(name: string, email: string): string {
  const safeName = name.replace(/["<>]/g, '').trim() || 'Mercy Dosa House';
  const safeEmail = email.trim().toLowerCase();
  return `${safeName} <${safeEmail}>`;
}

export function sanitizeEmailError(
  message: string,
  secrets: Array<string | undefined | null>,
): string {
  let out = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 3) {
      out = out.split(secret).join('[redacted]');
    }
  }
  return out
    .replace(/(pass(word)?|pwd|secret|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

export function resolvePublicAssetUrl(
  raw: string | null | undefined,
  websiteUrl: string,
  storagePublicUrl?: string | null,
): string {
  const site = (websiteUrl || DEFAULT_WEBSITE).replace(/\/$/, '');
  const fallback = `${site}${DEFAULT_LOGO_PATH}`;
  const value = raw?.trim();
  if (!value) return fallback;
  const lower = value.toLowerCase();
  if (lower.startsWith('file:') || lower.includes('\\') || /^[a-z]:\//i.test(value)) {
    return fallback;
  }
  if (lower.startsWith('https://')) return value;
  if (lower.startsWith('http://')) {
    return process.env.NODE_ENV === 'production' ? value.replace(/^http:\/\//i, 'https://') : value;
  }
  if (value.startsWith('/')) return `${site}${value}`;
  const storage = storagePublicUrl?.replace(/\/$/, '');
  if (storage) return `${storage}/${value.replace(/^\//, '')}`;
  return fallback;
}

export function resolveWebsiteUrl(raw?: string | null, envUrl?: string | null): string {
  const value = (raw || envUrl || DEFAULT_WEBSITE).trim();
  if (value.startsWith('http://') && process.env.NODE_ENV === 'production') {
    return value.replace(/^http:\/\//i, 'https://');
  }
  return value.replace(/\/$/, '') || DEFAULT_WEBSITE;
}
