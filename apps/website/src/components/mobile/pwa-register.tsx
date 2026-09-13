'use client';

import { useEffect } from 'react';

/** Registers the service worker. The custom PWA install banner is hidden while the Android app is the primary install path. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    }

    const hideBrowserInstallPrompt = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener('beforeinstallprompt', hideBrowserInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', hideBrowserInstallPrompt);
  }, []);

  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
