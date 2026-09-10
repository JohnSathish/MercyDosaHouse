import type { PaginatedResult } from '@mdh/types';
import { API_URL } from './constants';
import { getAccessToken, isAccessTokenExpired } from './auth-storage';
import { refreshSession } from './auth-api';
import { getAppChannelToken } from './app-channel';
import { setNetworkOnline } from './network-status';

export class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {},
    retried = false,
    skipAuth = false,
  ): Promise<T> {
    let token = skipAuth ? null : await getAccessToken();
    if (token && isAccessTokenExpired(token) && !retried && !skipAuth) {
      const refreshed = await refreshSession();
      if (refreshed.status === 'success') {
        token = refreshed.tokens.accessToken;
      } else if (refreshed.status === 'invalid') {
        token = null;
      }
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    headers['X-MDH-Client'] = 'mercy-android-customer';
    headers['X-MDH-Package'] = 'com.mercydosahouse.customer';
    if (!path.startsWith('/auth/app-channel')) {
      try {
        const appToken = await getAppChannelToken();
        if (appToken) headers['X-MDH-App-Token'] = appToken;
      } catch {
        /* Catalog and other public routes must still load without app attestation. */
      }
    }

    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
      setNetworkOnline(true);
    } catch {
      setNetworkOnline(false);
      throw new Error('Network error. Check your internet connection and try again.');
    }

    if (res.status === 401 && !retried) {
      if (token && !skipAuth) {
        const refreshed = await refreshSession();
        if (refreshed.status === 'success') {
          return this.request<T>(path, options, true);
        }
        if (refreshed.status === 'unavailable') {
          throw new Error('Network error. Check your internet connection and try again.');
        }
      }
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'GET' && !skipAuth) {
        return this.request<T>(path, options, true, true);
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(
        Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Request failed',
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  list<T>(path: string) {
    return this.get<PaginatedResult<T>>(path);
  }
}

export const api = new ApiClient();
