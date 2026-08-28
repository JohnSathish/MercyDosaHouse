import type {
  AuthTokens,
  AuthUser,
  LoginRequest,
  OtpSendRequest,
  OtpVerifyRequest,
  EmailOtpSendRequest,
  EmailOtpVerifyRequest,
  EmailOtpResendRequest,
  EmailOtpSendResponse,
  AuthMethodsDto,
  GoogleAuthRequest,
} from '@mdh/types';

const ACCESS_KEY = 'mdh_access_token';
const REFRESH_KEY = 'mdh_refresh_token';
const USER_KEY = 'mdh_user';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeAuth(tokens: AuthTokens, user: AuthUser): void {
  if (!tokens?.accessToken || !tokens?.refreshToken) {
    throw new Error('Login failed. Please try again.');
  }
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('mdh-auth-cleared'));
  }
}

export async function login(
  apiBase: string,
  credentials: LoginRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await res.json().catch(() => ({}));
  const body = (data?.tokens ? data : data?.data) ?? data;
  const message = Array.isArray(body?.message)
    ? body.message.join(', ')
    : body?.message || data.message || 'Login failed';
  if (!res.ok) throw new Error(message);
  if (!body?.tokens?.accessToken) {
    throw new Error(message === 'Login failed' ? 'Login failed. Please try again.' : message);
  }
  storeAuth(body.tokens, body.user);
  return body;
}

export async function sendOtp(apiBase: string, payload: OtpSendRequest): Promise<void> {
  const res = await fetch(`${apiBase}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
}

export async function getAuthMethods(apiBase: string): Promise<AuthMethodsDto> {
  const res = await fetch(`${apiBase}/auth/methods`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Unable to load sign-in options');
  }
  return data as AuthMethodsDto;
}

export async function sendEmailOtp(
  apiBase: string,
  payload: EmailOtpSendRequest,
): Promise<EmailOtpSendResponse> {
  const res = await fetch(`${apiBase}/auth/otp/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (!res.ok) throw new Error(message || "We couldn't send the email. Please try again.");
  return data as EmailOtpSendResponse;
}

export async function verifyEmailOtp(
  apiBase: string,
  payload: EmailOtpVerifyRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${apiBase}/auth/otp/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (!res.ok) throw new Error(message || "We couldn't verify that code. Please try again.");
  storeAuth(data.tokens, data.user);
  return data;
}

export async function resendEmailOtp(
  apiBase: string,
  payload: EmailOtpResendRequest,
): Promise<EmailOtpSendResponse> {
  const res = await fetch(`${apiBase}/auth/otp/email/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (!res.ok) throw new Error(message || "We couldn't send the email. Please try again.");
  return data as EmailOtpSendResponse;
}

export async function googleLogin(
  apiBase: string,
  payload: GoogleAuthRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${apiBase}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  if (!res.ok) {
    throw new Error(message || "We couldn't complete Google sign-in. Please try again.");
  }
  storeAuth(data.tokens, data.user);
  return data;
}

export async function verifyOtp(
  apiBase: string,
  payload: OtpVerifyRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${apiBase}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid OTP');
  storeAuth(data.tokens, data.user);
  return data;
}

export async function refreshTokens(apiBase: string): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } catch {
    clearAuth();
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    clearAuth();
    return null;
  }
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
  storeAuth(data.tokens, data.user);
  return data.tokens;
}

export async function logout(apiBase: string): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearAuth();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

const AUTH_CLEARED_EVENT = 'mdh-auth-cleared';

function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
}

/** Reuse valid access token, refresh when expired, or clear stale auth. */
export async function ensureAuthenticated(apiBase: string): Promise<AuthUser | null> {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  if (!access && !refresh) return null;

  if (access && !isAccessTokenExpired(access)) {
    const user = getStoredUser();
    if (user) return user;
  }

  if (refresh) {
    const tokens = await refreshTokens(apiBase);
    if (tokens) return getStoredUser();
  }

  clearAuth();
  return null;
}

export function onAuthCleared(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(AUTH_CLEARED_EVENT, listener);
  return () => window.removeEventListener(AUTH_CLEARED_EVENT, listener);
}

export type { AuthUser, AuthTokens, AuthMethodsDto, EmailOtpSendResponse } from '@mdh/types';
export * from './roles';
