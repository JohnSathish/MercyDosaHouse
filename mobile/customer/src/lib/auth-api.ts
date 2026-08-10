import type { AuthTokens, AuthUser, OtpSendRequest, OtpVerifyRequest } from '@mdh/types';
import { API_URL } from './constants';
import { clearAuth, getRefreshToken, storeAuth } from './auth-storage';

export async function sendOtp(payload: OtpSendRequest): Promise<void> {
  const res = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
}

export async function verifyOtp(
  payload: OtpVerifyRequest,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid OTP');
  await storeAuth(data.tokens, data.user);
  return data;
}

export async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearAuth();
    return null;
  }
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
  await storeAuth(data.tokens, data.user);
  return data.tokens;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearAuth();
}
