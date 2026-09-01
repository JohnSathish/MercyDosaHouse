import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { BusinessSettingsDto, ProductDto } from '@mdh/types';
import {
  calculateDeliveryCharge,
  CHICKEN_BIRYANI_SLUG,
  formatCurrency,
  formatPromotionTime,
  isChickenDumBiryaniProduct,
  promotionDeliverySlot,
} from '@mdh/utils';
import { getMarketingBundle } from '@/lib/marketing-content';
import { buildPageMetadata, canonicalUrl, getPublicSeo } from '@/lib/seo';
import { getProductImage, productImageAlt } from '@/lib/product-images';

export const generateMetadata = () =>
  buildPageMetadata('chicken-dum-biryani-tura', '/chicken-dum-biryani-tura', {
    title: 'Chicken Dum Biryani in Tura | Mercy Dosa House',
    description:
      'Chicken Dum Biryani from Mercy Dosa House in Tura. Live price, Sunday availability and pre-order details from the kitchen settings.',
  });

async function loadProduct() {
  try {
    return await api.get<ProductDto>(`/products/slug/${CHICKEN_BIRYANI_SLUG}`);
  } catch {
    return null;
  }
}

async function loadSettings() {
  try {
    return await api.get<BusinessSettingsDto>('/settings/business');
  } catch {
    return null;
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function ChickenDumBiryaniPage() {
  const [product, settings, marketing, seo] = await Promise.all([
    loadProduct(),
    loadSettings(),
    getMarketingBundle(),
    getPublicSeo(),
  ]);

  const promotion = marketing.announcements.find(
    (item) =>
      item.promotionWebsiteEnabled !== false &&
      item.promotionProduct &&
      isChickenDumBiryaniProduct(item.promotionProduct),
  );
  const packing = Number(product?.packingCharge ?? settings?.packingCharge ?? 20);
  const delivery = product
    ? calculateDeliveryCharge(product.price, {
        deliveryCharge: settings?.deliveryCharge ?? 30,
        freeDeliveryLimit: settings?.freeDeliveryLimit ?? 299,
        orderType: 'DELIVERY',
      }).amount
    : 0;
  const soldOut =
    !product?.isAvailable ||
    (promotion?.promotionRemainingQuantity != null && promotion.promotionRemainingQuantity <= 0);
  const ready = formatPromotionTime(promotion?.promotionReadyTime);
  const slot = promotionDeliverySlot(promotion?.promotionReadyTime);
  const cutoff =
    promotion?.promotionPreOrderCutoffDay != null
      ? WEEKDAYS[promotion.promotionPreOrderCutoffDay]
      : null;
  const href =
    product && !soldOut
      ? promotion?.ctaUrl?.trim() ||
        `/checkout?product=${encodeURIComponent(product.slug)}${
          promotion?.id ? `&promotion=${encodeURIComponent(promotion.id)}` : ''
        }&preorder=1`
      : undefined;

  if (!product) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-[#14532D]">Chicken Dum Biryani</h1>
        <p className="mt-4 text-gray-600">
          This dish is not on the live menu right now. Please check the{' '}
          <Link href="/menu" className="font-semibold text-[#14532D] underline">
            menu
          </Link>{' '}
          or{' '}
          <Link href="/contact" className="font-semibold text-[#14532D] underline">
            contact us
          </Link>
          .
        </p>
      </div>
    );
  }

  const image = getProductImage(product);
  const itemLd =
    product.isAvailable && !soldOut
      ? {
          '@context': 'https://schema.org',
          '@type': 'MenuItem',
          name: product.name,
          description: product.description || undefined,
          image,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: canonicalUrl(`/menu/${product.slug}`, seo.config),
          },
        }
      : null;

  return (
    <article className="container mx-auto max-w-4xl px-4 py-12 lg:py-16">
      {itemLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemLd) }}
        />
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F59E0B]">
        Mercy Dosa House · Tura
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#14532D] md:text-4xl">{product.name}</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        {product.seoDescription ||
          product.description ||
          'Chicken Dum Biryani from our kitchen in Tura. Details below come from the live product and Sunday promotion settings.'}
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="relative h-72 overflow-hidden rounded-2xl bg-[#FFF8E8] md:h-96">
          <Image
            src={image}
            alt={productImageAlt(product)}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <p className="text-3xl font-bold text-[#14532D]">{formatCurrency(product.price)}</p>
          <p className="mt-2 text-sm text-gray-600">
            {product.isAvailable ? 'Listed as available on the menu' : 'Currently unavailable'}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[#14532D]/10 bg-white p-3">
              <dt className="text-xs uppercase text-gray-500">Packing</dt>
              <dd className="font-semibold">{formatCurrency(packing)}</dd>
            </div>
            <div className="rounded-xl border border-[#14532D]/10 bg-white p-3">
              <dt className="text-xs uppercase text-gray-500">Delivery</dt>
              <dd className="font-semibold">
                {delivery === 0 ? 'Free' : formatCurrency(delivery)}
              </dd>
            </div>
            <div className="rounded-xl border border-[#14532D]/10 bg-white p-3">
              <dt className="text-xs uppercase text-gray-500">Prep time</dt>
              <dd className="font-semibold">{product.prepTimeMinutes} min</dd>
            </div>
            <div className="rounded-xl border border-[#14532D]/10 bg-white p-3">
              <dt className="text-xs uppercase text-gray-500">Ready</dt>
              <dd className="font-semibold">{slot || ready || 'See promotion settings'}</dd>
            </div>
          </dl>
          {promotion ? (
            <p className="mt-4 text-sm text-gray-600">
              Promotion day follows the weekday configured on the announcement. Pre-order cutoff:{' '}
              {cutoff ?? 'see kitchen settings'}. Remaining quantity:{' '}
              {promotion.promotionRemainingQuantity != null
                ? promotion.promotionRemainingQuantity
                : 'not limited in settings'}
              .
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              Sunday schedule follows the kitchen’s product and marketing settings. When a Sunday
              promotion is published, this page shows ready time and remaining quantity
              automatically.
            </p>
          )}
          {product.ingredients ? (
            <p className="mt-4 text-sm text-gray-600">
              <span className="font-semibold text-[#14532D]">Ingredients: </span>
              {product.ingredients}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {href && !soldOut ? (
              <Link
                href={href}
                className="inline-flex min-h-11 items-center rounded-xl bg-[#F59E0B] px-5 font-bold text-[#1F2937]"
              >
                Order / pre-book
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-xl bg-gray-100 px-5 font-semibold text-gray-500">
                Not orderable right now
              </span>
            )}
            <Link
              href={`/menu/${product.slug}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#14532D]/20 px-5 font-semibold text-[#14532D]"
            >
              Product page
            </Link>
            <Link
              href="/menu"
              className="inline-flex min-h-11 items-center px-3 font-semibold text-[#14532D] underline"
            >
              Full menu
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
