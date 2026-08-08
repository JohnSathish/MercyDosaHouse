'use client';

import { useEffect, useState } from 'react';

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => undefined);
        })
        .catch(() => undefined);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setShowInstall(false);
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="lg:hidden fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#14532D] text-white px-4 py-3 shadow-xl">
        <div>
          <p className="font-semibold text-sm">Install Mercy Dosa House</p>
          <p className="text-xs text-white/80">Order faster from your home screen</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-xl bg-[#F59E0B] px-4 py-2 text-sm font-bold text-[#1F2937] min-h-[44px] active:scale-95 transition-transform"
        >
          Install
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
