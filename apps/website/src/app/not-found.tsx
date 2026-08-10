import Link from 'next/link';
import { Button } from '@mdh/ui';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-[#FFF8E8]">
      <span className="text-6xl mb-4">🍽️</span>
      <h1 className="text-3xl font-bold text-[#14532D] mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        Sorry, we couldn&apos;t find that page. It may have moved or no longer exists.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/">
          <Button className="min-h-[48px] px-8 rounded-2xl bg-[#14532D]">Go Home</Button>
        </Link>
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
