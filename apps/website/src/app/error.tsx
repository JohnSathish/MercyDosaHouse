'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@mdh/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-[#FFF8E8]">
      <span className="text-6xl mb-4">😔</span>
      <h1 className="text-3xl font-bold text-[#14532D] mb-2">Something Went Wrong</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        We hit an unexpected error. Please try again, or return to the menu to continue ordering.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={reset} className="min-h-[48px] px-8 rounded-2xl bg-[#14532D]">
          Try Again
        </Button>
        <Link href="/menu">
          <Button
            variant="outline"
            className="min-h-[48px] px-8 rounded-2xl border-[#14532D] text-[#14532D]"
          >
            Browse Menu
          </Button>
        </Link>
      </div>
    </div>
  );
}
