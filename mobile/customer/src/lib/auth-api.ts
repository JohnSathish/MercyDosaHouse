import type {
  AuthTokens,
  AuthUser,
  AuthMethodsDto,
  EmailOtpResendRequest,
  EmailOtpSendRequest,
  EmailOtpSendResponse,
  EmailOtpVerifyRequest,
  GoogleAuthRequest,
  OtpSendRequest,
  OtpVerifyRequest,
} from '@mdh/types';
import { API_URL } from './constants';
import {
  assertAuthPayload,
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getStoredPushToken,
  getStoredUser,
  isAccessTokenExpired,
  storeAuth,
} from './auth-storage';

type RefreshResult =
  | { status: 'success'; tokens: AuthTokens }
  | { status: 'invalid' }
  | { status: 'unavailable' }
  | { status: 'skipped' };

let refreshInflight: Promise<RefreshResult> | null = null;

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  return message || fallback;
}

function parseAuthPayload(data: unknown): { tokens: AuthTokens; user: AuthUser } {
  const root = (data ?? {}) as Record<string, unknown>;
  const nested = (root.data ?? {}) as Record<string, unknown>;
  const tokens = (root.tokens ?? nested.tokens) as AuthTokens | undefined;
  const user = (root.user ?? nested.user) as AuthUser | undefined;
  return assertAuthPayload(tokens, user);
}

export async function getAuthMethods(): Promise<AuthMethodsDto> {
  const res = await fetch(`${API_URL}/auth/methods`);
  if (!res.ok) throw new Error(await readError(res, 'Unable to load sign-in options'));
  return (await res.json()) as AuthMethodsDto;
}

export async function sendEmailOtp(payload: EmailOtpSendRequest): Promise<EmailOtpSendResponse> {
  const res = await fetch(`${API_URL}/auth/otp/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, "We couldn't send the email. Please try again."));
  return (await res.json()) as EmailOtpSendResponse;
}

export async function verifyEmailOtp(
  payload: EmailOtpVerifyRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/otp/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, "We couldn't verify that code. Please try again."));
  const data = parseAuthPayload(await res.json().catch(() => ({})));
  await storeAuth(data.tokens, data.user);
  return data;
}

export async function resendEmailOtp(
  payload: EmailOtpResendRequest,
): Promise<EmailOtpSendResponse> {
  const res = await fetch(`${API_URL}/auth/otp/email/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, "We couldn't send the email. Please try again."));
  return (await res.json()) as EmailOtpSendResponse;
}

export async function googleLogin(
  payload: GoogleAuthRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readError(res, "We couldn't complete Google sign-in. Please try again."));
  }
  const data = parseAuthPayload(await res.json().catch(() => ({})));
  await storeAuth(data.tokens, data.user);
  return data;
}

export async function sendOtp(payload: OtpSendRequest): Promise<void> {
  const res = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to send OTP'));
}

export async function verifyOtp(
  payload: OtpVerifyRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, 'Invalid OTP'));
  const data = parseAuthPayload(await res.json().catch(() => ({})));
  await storeAuth(data.tokens, data.user);
  return data;
}

async function refreshTokensOnce(): Promise<RefreshResult> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return { status: 'skipped' };

  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    return { status: 'unavailable' };
  }

  if (res.status === 401 || res.status === 403) {
    await clearAuth({ notifyExpired: true });
    return { status: 'invalid' };
  }
  if (!res.ok) return { status: 'unavailable' };

  try {
    const data = parseAuthPayload(await res.json().catch(() => ({})));
    await storeAuth(data.tokens, data.user);
    return { status: 'success', tokens: data.tokens };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function refreshTokens(): Promise<AuthTokens | null> {
  const result = await refreshSession();
  return result.status === 'success' ? result.tokens : null;
}

export async function refreshSession(): Promise<RefreshResult> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = refreshTokensOnce().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

export async function ensureSession(): Promise<AuthUser | null> {
  const access = await getAccessToken();
  const refresh = await getRefreshToken();
  if (!access && !refresh) return null;

  if (access && !isAccessTokenExpired(access)) {
    return getStoredUser();
  }

  const result = await refreshSession();
  if (result.status === 'success' || result.status === 'unavailable') {
    return getStoredUser();
  }
  return null;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  const pushToken = await getStoredPushToken();
  if (pushToken) {
    await fetch(`${API_URL}/notifications/device-token/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ token: pushToken }),
    }).catch(() => undefined);
  }
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearAuth();
}

async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
