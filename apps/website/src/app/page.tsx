import { api } from '@/lib/api';
import type { ProductDto, BusinessSettingsDto, ReviewSummaryDto } from '@mdh/types';
import { isChickenDumBiryaniProduct } from '@mdh/utils';
import { HomePageClient } from '@/components/home/home-page-client';
import { absoluteAsset, buildPageMetadata, canonicalUrl, getPublicSeo } from '@/lib/seo';
import { getProductImage } from '@/lib/product-images';

export const generateMetadata = () =>
  buildPageMetadata('home', '/', {
    title: 'Mercy Dosa House — Authentic South Indian Food in Tura',
    description:
      'Mercy Dosa House offers freshly prepared South Indian food in Tura, Meghalaya — crispy dosas, fluffy idlis and Chicken Dum Biryani every Sunday. Order online for home delivery.',
  });

async function getHomeData() {
  try {
    const result = await Promise.race([
      Promise.all([
        api.get<{ data: ProductDto[] }>('/products?limit=50'),
        api.get<BusinessSettingsDto>('/settings/business'),
        api.get<ReviewSummaryDto>('/reviews/summary'),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!result) return { products: [], settings: null, rating: null };
    const [products, settings, rating] = result;
    return { products: products.data, settings, rating };
  } catch {
    return { products: [], settings: null, rating: null };
  }
}

export default async function HomePage() {
  const [{ products, settings }, seo] = await Promise.all([getHomeData(), getPublicSeo()]);
  const biryani = products.find((item) => isChickenDumBiryaniProduct(item));
  const productLd =
    biryani && biryani.isAvailable !== false
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: biryani.name,
          description: biryani.description || undefined,
          image: absoluteAsset(getProductImage(biryani), seo.config),
          brand: { '@type': 'Brand', name: 'Mercy Dosa House' },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl('/chicken-dum-biryani-tura', seo.config),
            priceCurrency: 'INR',
            price: biryani.price,
            availability: 'https://schema.org/PreOrder',
          },
        }
      : null;

  return (
    <>
      {productLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
      ) : null}
      <HomePageClient products={products} settings={settings} />
    </>
  );
}
