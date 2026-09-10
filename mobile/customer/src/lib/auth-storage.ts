import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens, AuthUser } from '@mdh/types';
import type { StorageAdapter } from '@mdh/mobile-shared';
import { notifyAuthChanged, notifySessionInvalidated } from './auth-events';

export const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const ACCESS_KEY = 'mdh_access_token';
const REFRESH_KEY = 'mdh_refresh_token';
const USER_KEY = 'mdh_user';
const PUSH_TOKEN_KEY = 'mdh_push_token';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

function usableSecret(value: string | null | undefined): string | null {
  if (!value || value === 'undefined' || value === 'null') return null;
  return value;
}

async function readSecret(key: string): Promise<string | null> {
  try {
    const secured = usableSecret(await SecureStore.getItemAsync(key, SECURE_OPTIONS));
    if (secured) return secured;
  } catch {
    /* SecureStore unavailable — fall through to legacy storage. */
  }

  const legacy = usableSecret(await AsyncStorage.getItem(key));
  if (legacy) {
    await writeSecret(key, legacy);
    await AsyncStorage.removeItem(key).catch(() => undefined);
  }
  return legacy;
}

async function writeSecret(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
    await AsyncStorage.removeItem(key).catch(() => undefined);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, SECURE_OPTIONS).catch(() => undefined);
  await AsyncStorage.removeItem(key).catch(() => undefined);
}

export async function getAccessToken(): Promise<string | null> {
  return readSecret(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return readSecret(REFRESH_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function assertAuthPayload(
  tokens: AuthTokens | null | undefined,
  user: AuthUser | null | undefined,
): { tokens: AuthTokens; user: AuthUser } {
  if (!tokens?.accessToken || !tokens?.refreshToken || !user?.id) {
    throw new Error('Login failed. Please try again.');
  }
  if (!usableSecret(tokens.accessToken) || !usableSecret(tokens.refreshToken)) {
    throw new Error('Login failed. Please try again.');
  }
  return { tokens, user };
}

export async function storeAuth(tokens: AuthTokens, user: AuthUser): Promise<void> {
  const payload = assertAuthPayload(tokens, user);
  await writeSecret(ACCESS_KEY, payload.tokens.accessToken);
  await writeSecret(REFRESH_KEY, payload.tokens.refreshToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  notifyAuthChanged();
}

export async function clearAuth(options?: { notifyExpired?: boolean }): Promise<void> {
  await deleteSecret(ACCESS_KEY);
  await deleteSecret(REFRESH_KEY);
  await AsyncStorage.multiRemove([USER_KEY, PUSH_TOKEN_KEY]).catch(() => undefined);
  notifyAuthChanged();
  if (options?.notifyExpired) notifySessionInvalidated();
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function storePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function saveTrackToken(orderNumber: string, token: string): Promise<void> {
  await AsyncStorage.setItem(`mdh_track_token:${orderNumber}`, token);
}

export async function loadTrackToken(orderNumber: string): Promise<string | null> {
  return AsyncStorage.getItem(`mdh_track_token:${orderNumber}`);
}

export async function isAuthenticated(): Promise<boolean> {
  const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
  return Boolean(access || refresh);
}

export function isAccessTokenExpired(token: string, skewMs = 30_000): boolean {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1] ?? '')) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
}

function base64UrlDecode(input: string): string {
  const padded =
    input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  if (typeof atob === 'function') return atob(padded);
  return Buffer.from(padded, 'base64').toString('utf8');
}
