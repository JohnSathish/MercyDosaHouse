'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@mdh/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#FFF8E8] font-sans">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <span className="text-6xl mb-4">⚠️</span>
          <h1 className="text-3xl font-bold text-[#14532D] mb-2">Service Unavailable</h1>
          <p className="text-gray-500 mb-8 max-w-md">
            Mercy Dosa House is temporarily unavailable. Please refresh or try again in a moment.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={reset}
              className="min-h-[48px] px-8 rounded-2xl bg-[#14532D] text-white"
            >
              Refresh
            </Button>
            <Link href="/">
              <Button variant="outline" className="min-h-[48px] px-8 rounded-2xl">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
