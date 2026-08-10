import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiBase(): string {
  const raw =
    process.env.EXPO_PUBLIC_API_URL ??
    (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

/** NestJS API base including `/api/v1` prefix */
export const API_URL = resolveApiBase();

/** Socket.IO base (no /api/v1) */
export const SOCKET_URL = API_URL.replace(/\/api\/v1$/, '');

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const BRAND = {
  primary: '#14532D',
  secondary: '#F59E0B',
  background: '#FFF7E6',
  text: '#1F2937',
} as const;
