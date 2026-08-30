'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

/**
 * Google Sign-In for the Android app. Google Web clients cannot use
 * custom schemes (mercydosa://), so the app opens this HTTPS page, GIS
 * issues an ID token here, then we bounce back into the app.
 */
export default function GoogleNativeAuthPage() {
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback((idToken: string) => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('redirect') || 'mercydosa://google-auth';
    const redirect = requested.toLowerCase().startsWith('mercydosa://')
      ? requested
      : 'mercydosa://google-auth';
    const separator = redirect.includes('?') ? '&' : '?';
    window.location.href = `${redirect}${separator}idToken=${encodeURIComponent(idToken)}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const res = await fetch(`${API_URL}/auth/methods`);
        const methods = (await res.json()) as { google?: boolean; googleClientId?: string | null };
        const clientId = methods.googleClientId;
        if (!methods.google || !clientId) {
          setError('Google sign-in is not configured.');
          return;
        }

        const render = () => {
          if (cancelled || !window.google?.accounts?.id) return;
          const host = document.getElementById('mdh-google-native');
          if (!host) return;
          host.innerHTML = '';
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.credential) finish(response.credential);
              else setError("Google sign-in couldn't be completed. Please try again.");
            },
          });
          window.google.accounts.id.renderButton(host, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'pill',
          });
        };

        if (window.google?.accounts?.id) {
          render();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = render;
        document.head.appendChild(script);
      } catch {
        setError("We couldn't start Google sign-in. Please try again.");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [finish]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12 bg-[#FFF8E8]">
      <p className="text-xs font-extrabold tracking-[0.2em] text-[#C17A08]">MERCY DOSA HOUSE</p>
      <h1 className="mt-3 text-2xl font-extrabold text-[#14532D]">Continue with Google</h1>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
        Sign in to finish your order. You will return to the Mercy Dosa House app automatically.
      </p>
      <div id="mdh-google-native" className="mt-8 min-h-[44px] flex justify-center" />
      {error ? <p className="mt-6 text-sm text-red-700 text-center">{error}</p> : null}
    </div>
  );
}
