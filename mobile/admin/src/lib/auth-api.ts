import type { AuthTokens, AuthUser } from '@mdh/types';
import { API_URL, STAFF_ROLES } from './constants';
import { clearAuth, getRefreshToken, storeAuth } from './auth-storage';
import { notifySessionInvalidated } from './auth-events';

function assertStaff(user: AuthUser) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const ok = user.isSuperAdmin || roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r));
  if (!ok) {
    throw new Error('This account is not authorized for the Admin app.');
  }
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Login failed',
    );
  }
  assertStaff(data.user);
  await storeAuth(data.tokens, data.user);
  return data;
}

export async function sendOtp(phone: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<{ tokens: AuthTokens; user: AuthUser }> {
  const res = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid OTP');
  assertStaff(data.user);
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
    notifySessionInvalidated();
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
