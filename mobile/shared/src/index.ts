import type { MobileAppConfigDto, MobileConfigVersionDto } from '@mdh/types';

export type StorageAdapter = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
};

export interface MobileConfigStoreOptions {
  apiBaseUrl: string;
  storage: StorageAdapter;
  cacheKey?: string;
  versionKey?: string;
  onConfigUpdated?: (config: MobileAppConfigDto) => void;
}

const DEFAULT_CACHE_KEY = '@mdh/mobile-config';
const DEFAULT_VERSION_KEY = '@mdh/mobile-config-version';

export class MobileConfigStore {
  private config: MobileAppConfigDto | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly cacheKey: string;
  private readonly versionKey: string;

  constructor(private readonly options: MobileConfigStoreOptions) {
    this.cacheKey = options.cacheKey ?? DEFAULT_CACHE_KEY;
    this.versionKey = options.versionKey ?? DEFAULT_VERSION_KEY;
  }

  /** Load cached config immediately, then refresh from API */
  async bootstrap(): Promise<MobileAppConfigDto> {
    const cached = await this.readCache();
    if (cached) {
      this.config = cached;
    }

    const fresh = await this.fetchRemote();
    this.startAutoRefresh(fresh.refreshIntervalSeconds);
    return fresh;
  }

  getConfig(): MobileAppConfigDto | null {
    return this.config;
  }

  isFeatureEnabled(key: string): boolean {
    return this.config?.featureFlags[key] ?? false;
  }

  getHomeSections() {
    return this.config?.homepage.filter((s) => s.isEnabled) ?? [];
  }

  async refreshIfStale(): Promise<MobileAppConfigDto | null> {
    try {
      const version = await this.fetchVersion();
      const cachedVersion = await this.readCachedVersion();
      if (cachedVersion && cachedVersion.configVersion >= version.configVersion) {
        return this.config;
      }
      return this.fetchRemote();
    } catch {
      return this.config;
    }
  }

  destroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private async fetchRemote(): Promise<MobileAppConfigDto> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(`${this.options.apiBaseUrl}/mobile/config`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        if (this.config) return this.config;
        throw new Error('Failed to load mobile config');
      }
      const data = (await res.json()) as MobileAppConfigDto;
      this.config = data;
      await this.writeCache(data);
      this.options.onConfigUpdated?.(data);
      return data;
    } catch (err) {
      if (this.config) return this.config;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Connection timed out. Check your internet and try again.');
      }
      throw err instanceof Error ? err : new Error('Failed to load mobile config');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchVersion(): Promise<MobileConfigVersionDto> {
    const res = await fetch(`${this.options.apiBaseUrl}/mobile/config/version`);
    if (!res.ok) throw new Error('Failed to load config version');
    return res.json() as Promise<MobileConfigVersionDto>;
  }

  private startAutoRefresh(intervalSeconds: number) {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    const ms = Math.max(intervalSeconds, 60) * 1000;
    this.refreshTimer = setInterval(() => {
      void this.refreshIfStale();
    }, ms);
  }

  private async readCache(): Promise<MobileAppConfigDto | null> {
    const raw = await this.options.storage.getItem(this.cacheKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MobileAppConfigDto;
    } catch {
      return null;
    }
  }

  private async writeCache(config: MobileAppConfigDto) {
    await this.options.storage.setItem(this.cacheKey, JSON.stringify(config));
    await this.options.storage.setItem(
      this.versionKey,
      JSON.stringify({
        configVersion: config.configVersion,
        updatedAt: config.updatedAt,
      }),
    );
  }

  private async readCachedVersion(): Promise<MobileConfigVersionDto | null> {
    const raw = await this.options.storage.getItem(this.versionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MobileConfigVersionDto;
    } catch {
      return null;
    }
  }
}

export function compareAppVersions(current: string, minimum: string): number {
  const parse = (v: string) => v.split('.').map((n) => Number(n.replace(/\D/g, '')) || 0);
  const a = parse(current);
  const b = parse(minimum);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function shouldForceUpdate(currentVersion: string, config: MobileAppConfigDto): boolean {
  if (!config.versionControl.forceUpdate) return false;
  return compareAppVersions(currentVersion, config.versionControl.minAppVersion) < 0;
}

export function shouldSoftUpdate(currentVersion: string, config: MobileAppConfigDto): boolean {
  if (config.versionControl.forceUpdate) return false;
  return compareAppVersions(currentVersion, config.versionControl.latestAppVersion) < 0;
}
