import { MobileConfigStore } from '@mdh/mobile-shared';
import { API_URL } from './constants';
import { asyncStorageAdapter } from './auth-storage';

let store: MobileConfigStore | null = null;

export function getConfigStore(): MobileConfigStore {
  if (!store) {
    store = new MobileConfigStore({
      apiBaseUrl: API_URL,
      storage: asyncStorageAdapter,
    });
  }
  return store;
}

export function resetConfigStore() {
  store?.destroy();
  store = null;
}
