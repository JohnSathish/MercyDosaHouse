import Link from 'next/link';
import type { Metadata } from 'next';
import type { BusinessSettingsDto } from '@mdh/types';
import { CHICKEN_BIRYANI_SLUG, isChickenDumBiryaniProduct } from '@mdh/utils';
import { api } from '@/lib/api';
import { getMarketingBundle } from '@/lib/marketing-content';
import { getPublishedSiteContent } from '@/lib/cms-content';
import { ChickenDumBiryaniLanding } from '@/components/biryani/chicken-dum-biryani-landing';
import { fetchChickenDumBiryaniProduct } from '@/lib/chicken-biryani';
import { getProductImage, productImageAlt } from '@/lib/product-images';
import { absoluteAsset, canonicalUrl, getPublicSeo } from '@/lib/seo';
import { restaurantJsonLd } from '@/lib/json-ld';

const SEO_TITLE = 'Chicken Dum Biryani in Tura | Mercy Dosa House';
const SEO_DESCRIPTION =
  'Order authentic Chicken Dum Biryani in Tura from Mercy Dosa House. Available every Sunday at 1 PM. Pre-order one day in advance. Home delivery available.';
const OG_TITLE = 'Sunday Chicken Dum Biryani | Mercy Dosa House';
const OG_DESCRIPTION = 'Freshly prepared Chicken Dum Biryani every Sunday in Tura. Pre-order now.';

export async function generateMetadata(): Promise<Metadata> {
  const [{ config, pages }, product] = await Promise.all([
    getPublicSeo(),
    fetchChickenDumBiryaniProduct(),
  ]);
  const entry = pages.find((p) => p.pageKey === 'chicken-dum-biryani-tura');
  const title = entry?.metaTitle || product?.seoTitle || SEO_TITLE;
  const description = entry?.metaDescription || product?.seoDescription || SEO_DESCRIPTION;
  const url = entry?.canonicalUrl || canonicalUrl('/chicken-dum-biryani-tura', config);
  const image = absoluteAsset(
    entry?.ogImage ||
      product?.imageUrl ||
      getProductImage(product || { slug: CHICKEN_BIRYANI_SLUG, imageUrl: null }),
    config,
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      url,
      type: 'website',
      locale: 'en_IN',
      siteName: 'Mercy Dosa House',
      images: [{ url: image, alt: product ? productImageAlt(product) : 'Chicken Dum Biryani' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: OG_TITLE,
      description: OG_DESCRIPTION,
      images: [image],
    },
  };
}

async function loadSettings() {
  try {
    return await api.get<BusinessSettingsDto>('/settings/business');
  } catch {
    return null;
  }
}

export default async function ChickenDumBiryaniPage() {
  const [product, settings, marketing, seo, cms] = await Promise.all([
    fetchChickenDumBiryaniProduct(),
    loadSettings(),
    getMarketingBundle(),
    getPublicSeo(),
    getPublishedSiteContent(),
  ]);

  if (!product) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-[#14532D]">Chicken Dum Biryani</h1>
        <p className="mt-4 text-gray-600">Chicken Dum Biryani is temporarily unavailable.</p>
        <Link
          href="/menu"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#14532D] px-5 font-bold text-white"
        >
          View menu
        </Link>
      </div>
    );
  }

  const promotion =
    marketing.announcements.find(
      (item) =>
        item.promotionWebsiteEnabled !== false &&
        item.promotionProduct &&
        isChickenDumBiryaniProduct(item.promotionProduct),
    ) ?? null;
  const origin = canonicalUrl('/chicken-dum-biryani-tura', seo.config);
  const image = absoluteAsset(getProductImage(product), seo.config);
  const jsonLd = [
    restaurantJsonLd({ settings, seo: seo.config, logoUrl: cms.theme?.logoUrl }),
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || SEO_DESCRIPTION,
      image,
      brand: { '@type': 'Brand', name: 'Mercy Dosa House' },
      offers: {
        '@type': 'Offer',
        url: origin,
        priceCurrency: 'INR',
        price: product.price,
        availability: product.isAvailable
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Restaurant', name: settings?.businessName || 'Mercy Dosa House' },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/', seo.config) },
        { '@type': 'ListItem', position: 2, name: 'Menu', item: canonicalUrl('/menu', seo.config) },
        { '@type': 'ListItem', position: 3, name: product.name, item: origin },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <ChickenDumBiryaniLanding
        product={product}
        settings={settings}
        promotion={promotion}
        offers={cms.offers ?? []}
      />
    </>
  );
}
