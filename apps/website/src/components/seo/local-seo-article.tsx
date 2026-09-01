import Link from 'next/link';
import type { BusinessSettingsDto } from '@mdh/types';
import { BRAND } from '@mdh/utils';

export const LOCAL_SEO_SLUGS = [
  'south-indian-restaurant-tura',
  'south-indian-food-tura',
  'dosa-tura',
  'idli-tura',
  'vada-tura',
] as const;

export type LocalSeoSlug = (typeof LOCAL_SEO_SLUGS)[number];

const COPY: Record<
  LocalSeoSlug,
  { heading: string; intro: string; sections: { title: string; body: string }[] }
> = {
  'south-indian-restaurant-tura': {
    heading: 'South Indian restaurant in Tura',
    intro:
      'Mercy Dosa House is a South Indian kitchen in Tura, Meghalaya. We cook dosa, idli, vada and Chicken Dum Biryani to order, and you can collect it or request home delivery where we currently serve.',
    sections: [
      {
        title: 'What we cook',
        body: 'Our menu is built around everyday South Indian food: crisp dosa, soft idli, vada, rice dishes and, on Sundays, Chicken Dum Biryani when it is listed as available. Prices and availability always follow the live menu.',
      },
      {
        title: 'Ordering in Tura',
        body: 'You can order online from this website, then choose takeaway or delivery according to the current delivery settings. Opening hours and the kitchen’s open/closed status are taken from the restaurant settings, not guessed on this page.',
      },
    ],
  },
  'south-indian-food-tura': {
    heading: 'South Indian food in Tura',
    intro:
      'If you are looking for South Indian food in Tura, Mercy Dosa House prepares dosa, idli, vada and related dishes in our kitchen. Every plate is made when you order — we do not list dishes that are not on the real menu.',
    sections: [
      {
        title: 'A short, honest menu',
        body: 'We keep the range focused so batter, chutney and gravies can be prepared properly. Open the menu for today’s prices. Sunday Chicken Dum Biryani has its own page with the current schedule and charges.',
      },
      {
        title: 'Delivery and takeaway',
        body: 'Home delivery depends on the areas and hours configured for Mercy Dosa House. If delivery is paused, you can still order for pickup. Contact us if you need directions in Tura.',
      },
    ],
  },
  'dosa-tura': {
    heading: 'Dosa in Tura',
    intro:
      'Mercy Dosa House serves dosa in Tura, Meghalaya. Varieties on the menu — such as plain or masala — are listed with live prices. We do not advertise a dosa that is not actually for sale.',
    sections: [
      {
        title: 'How to order dosa',
        body: 'Choose a dosa from the menu, add it to your cart, and check out for takeaway or delivery. Prep time is shown on each product when it is configured.',
      },
    ],
  },
  'idli-tura': {
    heading: 'Idli in Tura',
    intro:
      'Idli at Mercy Dosa House is steamed in our kitchen in Tura. Check the menu for the current idli items, portion size and price before you order.',
    sections: [
      {
        title: 'Pair it simply',
        body: 'Many guests add vada or dosa from the same kitchen. The menu shows what is available now; we do not invent combo names that are not on the catalogue.',
      },
    ],
  },
  'vada-tura': {
    heading: 'Vada in Tura',
    intro:
      'Vada from Mercy Dosa House is fried to order in Tura. See the live menu for which vada items we sell today and what they cost.',
    sections: [
      {
        title: 'Order with the rest of the meal',
        body: 'Add vada alongside idli or dosa in one checkout. Delivery charges and packing follow store settings, not a separate vada-only price list.',
      },
    ],
  },
};

export function LocalSeoArticle({
  slug,
  settings,
}: {
  slug: LocalSeoSlug;
  settings: BusinessSettingsDto | null;
}) {
  const copy = COPY[slug];
  const name = settings?.businessName?.trim() || BRAND.name;
  const hours = settings?.openingHours?.trim();
  const address = settings?.address?.trim();
  const phone = settings?.phone?.trim();

  return (
    <article className="container mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F59E0B]">{name}</p>
      <h1 className="mt-2 text-3xl font-bold text-[#14532D] md:text-4xl">{copy.heading}</h1>
      <p className="mt-4 text-gray-600 leading-relaxed">{copy.intro}</p>
      {copy.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-xl font-semibold text-[#14532D]">{section.title}</h2>
          <p className="mt-2 text-gray-600 leading-relaxed">{section.body}</p>
        </section>
      ))}
      {(hours || address || phone) && (
        <section className="mt-8 rounded-2xl border border-[#14532D]/10 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#14532D]">Visit or call</h2>
          {address ? <p className="mt-2 text-sm text-gray-600">{address}</p> : null}
          {hours ? <p className="mt-1 text-sm text-gray-600">Hours: {hours}</p> : null}
          {phone ? (
            <p className="mt-1 text-sm text-gray-600">
              Phone:{' '}
              <a className="font-semibold text-[#14532D] underline" href={`tel:${phone}`}>
                {phone}
              </a>
            </p>
          ) : null}
        </section>
      )}
      <nav className="mt-10 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/menu" className="rounded-xl bg-[#14532D] px-4 py-2 text-white">
          View menu
        </Link>
        <Link
          href="/contact"
          className="rounded-xl border border-[#14532D]/20 px-4 py-2 text-[#14532D]"
        >
          Contact / directions
        </Link>
        <Link
          href="/chicken-dum-biryani-tura"
          className="rounded-xl border border-[#F59E0B]/40 px-4 py-2 text-[#14532D]"
        >
          Chicken Dum Biryani
        </Link>
      </nav>
    </article>
  );
}
