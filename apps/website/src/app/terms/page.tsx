import Link from 'next/link';
import { BRAND } from '@mdh/utils';

export const metadata = { title: 'Terms of Use' };

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-[#14532D]">Terms of Use</h1>
      <p className="mt-4 text-gray-600">
        A full terms of use document has not been published yet. Until then, please{' '}
        <Link href="/contact" className="font-semibold text-[#14532D] underline">
          contact {BRAND.name}
        </Link>{' '}
        for questions about ordering, delivery, or your account. See also our{' '}
        <Link href="/privacy" className="font-semibold text-[#14532D] underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
