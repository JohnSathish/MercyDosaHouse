import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@mdh/mobile-shared';

export const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const ACCESS_KEY = 'mdh_access_token';
const REFRESH_KEY = 'mdh_refresh_token';
const USER_KEY = 'mdh_user';
const PUSH_TOKEN_KEY = 'mdh_push_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function getStoredUser(): Promise<import('@mdh/types').AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as import('@mdh/types').AuthUser;
  } catch {
    return null;
  }
}

export async function storeAuth(
  tokens: import('@mdh/types').AuthTokens,
  user: import('@mdh/types').AuthUser,
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, tokens.accessToken],
    [REFRESH_KEY, tokens.refreshToken],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY, PUSH_TOKEN_KEY]);
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function storePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}
