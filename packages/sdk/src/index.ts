import { getAccessToken, refreshTokens, clearAuth } from '@mdh/auth-client';
import type { PaginatedResult } from '@mdh/types';

export class MdhApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (res.status === 401 && !retried) {
      const refreshed = await refreshTokens(this.baseUrl);
      if (refreshed) return this.request<T>(path, options, true);
      clearAuth();
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

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  upload<T>(path: string, formData: FormData) {
    return this.request<T>(path, { method: 'POST', body: formData });
  }

  list<T>(path: string) {
    return this.get<PaginatedResult<T>>(path);
  }
}

export function createApiClient(baseUrl: string) {
  return new MdhApiClient(baseUrl);
}
