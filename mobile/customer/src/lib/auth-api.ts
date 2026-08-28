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
import { clearAuth, getRefreshToken, storeAuth } from './auth-storage';

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  return message || fallback;
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
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
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
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
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
  const data = (await res.json()) as { tokens: AuthTokens; user: AuthUser };
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
