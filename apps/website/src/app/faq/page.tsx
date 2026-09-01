import { getPublishedSiteContent } from '@/lib/cms-content';
import { BRAND } from '@mdh/utils';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const generateMetadata = () => buildPageMetadata('faq', '/faq');

export default async function FaqPage() {
  const cms = await getPublishedSiteContent();
  const faqs = (cms.faqs ?? []).filter((item) => item.isPublished !== false);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-[#14532D]">Frequently Asked Questions</h1>
      {faqs.length ? (
        <dl className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.id} className="rounded-2xl border border-[#14532D]/10 bg-white p-5">
              <dt className="font-semibold text-[#14532D]">{faq.question}</dt>
              <dd className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-6 text-gray-600">
          We have not published FAQ copy yet. For help with an order, please{' '}
          <Link href="/contact" className="font-semibold text-[#14532D] underline">
            contact {BRAND.name}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
