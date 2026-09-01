import Link from 'next/link';
import { BRAND } from '@mdh/utils';

export const metadata = { title: 'Returns & Refunds' };

export default function RefundsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-[#14532D]">Returns & Refunds</h1>
      <p className="mt-4 text-gray-600">
        Written returns and refunds policy copy has not been published yet. If something was wrong
        with an order, please{' '}
        <Link href="/contact" className="font-semibold text-[#14532D] underline">
          contact {BRAND.name}
        </Link>{' '}
        with your order number and we will help from there.
      </p>
    </div>
  );
}
