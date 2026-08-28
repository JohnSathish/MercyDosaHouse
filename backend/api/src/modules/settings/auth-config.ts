export type AuthConfig = {
  emailOtp: boolean;
  google: boolean;
  mobileOtp: boolean;
  guest: boolean;
  otpExpirySeconds: number;
  resendCooldownSeconds: number;
  maxAttempts: number;
  senderName: string;
  senderEmail: string;
  websiteUrl: string;
};

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  emailOtp: true,
  google: true,
  mobileOtp: false,
  guest: true,
  otpExpirySeconds: 600,
  resendCooldownSeconds: 60,
  maxAttempts: 5,
  senderName: 'Mercy Dosa House',
  senderEmail: 'info@mercydosahouse.com',
  websiteUrl: 'https://mercydosahouse.com',
};

function parseSenderEmail(raw: unknown, fallback: string): string {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return fallback;
  return v;
}

export function parseAuthConfig(raw: unknown): AuthConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  const senderName =
    typeof o.senderName === 'string' && o.senderName.trim()
      ? o.senderName.replace(/["<>]/g, '').trim().slice(0, 80)
      : DEFAULT_AUTH_CONFIG.senderName;
  const websiteUrl =
    typeof o.websiteUrl === 'string' && /^https?:\/\//i.test(o.websiteUrl.trim())
      ? o.websiteUrl.trim().replace(/\/$/, '')
      : DEFAULT_AUTH_CONFIG.websiteUrl;
  return {
    emailOtp: o.emailOtp !== false,
    google: o.google !== false,
    mobileOtp: o.mobileOtp === true,
    guest: o.guest !== false,
    otpExpirySeconds: num(o.otpExpirySeconds, 600, 60, 1800),
    resendCooldownSeconds: num(o.resendCooldownSeconds, 60, 15, 300),
    maxAttempts: num(o.maxAttempts, 5, 3, 10),
    senderName,
    senderEmail: parseSenderEmail(o.senderEmail, DEFAULT_AUTH_CONFIG.senderEmail),
    websiteUrl,
  };
}
