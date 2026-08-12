import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthTokens, AuthUser } from '@mdh/types';

const ACCESS_KEY = 'mdh_admin_access_token';
const REFRESH_KEY = 'mdh_admin_refresh_token';
const USER_KEY = 'mdh_admin_user';
const REMEMBER_KEY = 'mdh_admin_remember';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
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

export async function storeAuth(tokens: AuthTokens, user: AuthUser): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, tokens.accessToken],
    [REFRESH_KEY, tokens.refreshToken],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
}

export async function setRememberDevice(value: boolean): Promise<void> {
  await AsyncStorage.setItem(REMEMBER_KEY, value ? '1' : '0');
}

export async function getRememberDevice(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMEMBER_KEY);
  return v !== '0';
}

export async function isAuthenticated(): Promise<boolean> {
  return !!(await getAccessToken());
}
