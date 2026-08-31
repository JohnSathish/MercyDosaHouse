export type AppPromoConfig = {
  enabled: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  playStoreUrl: string;
  showOnWebsite: boolean;
  showOnCheckout: boolean;
  showOnMenu: boolean;
  showAsPopup: boolean;
};

export const DEFAULT_APP_PROMO_CONFIG: AppPromoConfig = {
  enabled: true,
  title: 'ORDER ON OUR APP & SAVE!',
  body: 'Get exclusive offers available only on the Mercy Dosa House App.',
  ctaLabel: 'Download App',
  playStoreUrl: '',
  showOnWebsite: true,
  showOnCheckout: true,
  showOnMenu: true,
  showAsPopup: true,
};

function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function playStoreUrl(value: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return '';
    if (parsed.hostname === 'play.google.com' || parsed.hostname.endsWith('.play.google.com')) {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export function parseAppPromoConfig(raw: unknown): AppPromoConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const url = str(o.playStoreUrl, DEFAULT_APP_PROMO_CONFIG.playStoreUrl);
  const safeUrl = playStoreUrl(url);
  return {
    enabled: bool(o.enabled, DEFAULT_APP_PROMO_CONFIG.enabled),
    title: str(o.title, DEFAULT_APP_PROMO_CONFIG.title) || DEFAULT_APP_PROMO_CONFIG.title,
    body: str(o.body, DEFAULT_APP_PROMO_CONFIG.body) || DEFAULT_APP_PROMO_CONFIG.body,
    ctaLabel:
      str(o.ctaLabel, DEFAULT_APP_PROMO_CONFIG.ctaLabel) || DEFAULT_APP_PROMO_CONFIG.ctaLabel,
    playStoreUrl: safeUrl,
    showOnWebsite: bool(o.showOnWebsite, DEFAULT_APP_PROMO_CONFIG.showOnWebsite),
    showOnCheckout: bool(o.showOnCheckout, DEFAULT_APP_PROMO_CONFIG.showOnCheckout),
    showOnMenu: bool(o.showOnMenu, DEFAULT_APP_PROMO_CONFIG.showOnMenu),
    showAsPopup: bool(o.showAsPopup, DEFAULT_APP_PROMO_CONFIG.showAsPopup),
  };
}
