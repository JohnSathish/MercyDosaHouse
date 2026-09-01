import Link from 'next/link';
import { getPublishedSiteContent } from '@/lib/cms-content';
import { buildPageMetadata } from '@/lib/seo';

export const generateMetadata = () => buildPageMetadata('offers', '/offers');

export default async function OffersPage() {
  const cms = await getPublishedSiteContent();
  const offers = cms.offers.filter((o) => o.isActive);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-[#14532D]">Offers</h1>
      {offers.length ? (
        <ul className="mt-8 space-y-4">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-2xl border border-[#14532D]/10 bg-white p-5">
              <h2 className="font-bold text-[#14532D]">{offer.title}</h2>
              {offer.description ? (
                <p className="mt-2 text-sm text-gray-600">{offer.description}</p>
              ) : null}
              {offer.buttonUrl ? (
                <Link
                  href={offer.buttonUrl}
                  className="mt-3 inline-block text-sm font-semibold text-[#14532D] underline"
                >
                  {offer.buttonLabel || 'View'}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-gray-600">
          There are no live website offers right now. See the{' '}
          <Link href="/menu" className="font-semibold text-[#14532D] underline">
            menu
          </Link>{' '}
          for current dishes and prices.
        </p>
      )}
    </div>
  );
}
