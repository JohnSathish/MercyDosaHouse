import { api } from '@/lib/api';
import type { ProductDto } from '@mdh/types';
import { BRAND } from '@mdh/utils';
import { ProductDetailClient } from '@/components/menu/product-detail-client';
import { absoluteAsset, canonicalUrl, getPublicSeo } from '@/lib/seo';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { config } = await getPublicSeo();
  try {
    const product = await api.get<ProductDto>(`/products/slug/${slug}`);
    const title = product.seoTitle || `${product.name} | ${BRAND.name} Tura`;
    const description =
      product.seoDescription ||
      product.description ||
      `${product.name} from Mercy Dosa House in Tura, Meghalaya.`;
    const url = canonicalUrl(`/menu/${product.slug}`, config);
    const image = absoluteAsset(product.imageUrl || config.defaultOgImage, config);
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, url, images: [{ url: image, alt: product.name }] },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  } catch {
    return { title: 'Menu item', robots: { index: false, follow: true } };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
