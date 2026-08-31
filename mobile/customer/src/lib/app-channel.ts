import Constants from 'expo-constants';
import { hmacSha256Hex, randomNonce } from './hmac-sha256';
import { API_URL } from './constants';

const PACKAGE_NAME = 'com.mercydosahouse.customer';
const CLIENT_ID = 'mercy-android-customer';

let cachedToken: string | null = null;
let expiresAt = 0;

function appChannelSecret(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { appChannelSecret?: string };
  const fromExtra = extra.appChannelSecret?.trim();
  if (fromExtra) return fromExtra;
  if (__DEV__) return 'mdh-dev-android-channel';
  return '';
}

export async function getAppChannelToken(): Promise<string | null> {
  const secret = appChannelSecret();
  if (!secret) return null;
  if (cachedToken && Date.now() < expiresAt - 30_000) return cachedToken;

  const ts = String(Date.now());
  const nonce = randomNonce();
  const message = `${ts}\n${nonce}\nPOST\n/auth/app-channel`;
  const sign = await hmacSha256Hex(secret, message);
  const res = await fetch(`${API_URL}/auth/app-channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-MDH-Client': CLIENT_ID,
      'X-MDH-Package': PACKAGE_NAME,
      'X-MDH-Ts': ts,
      'X-MDH-Nonce': nonce,
      'X-MDH-Sign': sign,
    },
  });
  if (!res.ok) {
    cachedToken = null;
    expiresAt = 0;
    return null;
  }
  const body = (await res.json()) as { token?: string; expiresIn?: number };
  if (!body.token) return null;
  cachedToken = body.token;
  expiresAt = Date.now() + Math.max(60, Number(body.expiresIn ?? 900)) * 1000;
  return cachedToken;
}
