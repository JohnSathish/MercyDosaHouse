import { createApiClient } from '@mdh/sdk';

/** Public URL for browser requests (baked at build time via NEXT_PUBLIC_API_URL). */
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mercydosahouse.com/api/v1';

/** Server-side URL — use Docker service name in production containers. */
function resolveApiUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_INTERNAL_URL || publicApiUrl;
  }
  return publicApiUrl;
}

export const API_URL = resolveApiUrl();
export const api = createApiClient(API_URL);
