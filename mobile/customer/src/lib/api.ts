import type { PaginatedResult } from '@mdh/types';
import { API_URL } from './constants';
import { clearAuth, getAccessToken } from './auth-storage';
import { refreshTokens } from './auth-api';
import { getAppChannelToken } from './app-channel';

export class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!path.startsWith('/auth/app-channel')) {
      const appToken = await getAppChannelToken();
      if (appToken) headers['X-MDH-App-Token'] = appToken;
    }

    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } catch {
      throw new Error('Network error. Check your internet connection and try again.');
    }

    if (res.status === 401 && !retried) {
      const refreshed = await refreshTokens();
      if (refreshed) return this.request<T>(path, options, true);
      await clearAuth();
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
