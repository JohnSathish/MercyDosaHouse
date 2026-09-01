import type { ProductDto } from '@mdh/types';

const DEFAULT_IMAGE = '/images/hero-dosa.png';

/** Local product images keyed by slug — used when API has no imageUrl yet */
const PRODUCT_IMAGES: Record<string, string> = {
  'plain-dosa': '/images/plain-dosa.png',
  'masala-dosa': '/images/hero-dosa.png',
  'paneer-dosa': '/images/paneer-dosa.png',
  'onion-dosa': '/images/onion-dosa.png',
  'mysore-masala-dosa': '/images/mysore-masala-dosa.png',
  'ghee-roast-dosa': '/images/ghee-roast-dosa.png',
  'chicken-biryani': '/images/chicken-biryani.png',
  'cheese-dosa': '/images/cheese-dosa.png',
  'idli-4-pieces': '/images/idli-4-pieces.png',
  'vada-4-pieces': '/images/vada-4-pieces.png',
};

export function getProductImage(product: Pick<ProductDto, 'slug' | 'imageUrl' | 'images'>): string {
  if (product.imageUrl) return product.imageUrl;
  if (product.images?.[0]) return product.images[0];
  return PRODUCT_IMAGES[product.slug] ?? DEFAULT_IMAGE;
}

export function productImageAlt(
  product: Pick<ProductDto, 'name' | 'slug'> & { imageAltText?: string | null },
): string {
  const custom = product.imageAltText?.trim();
  if (custom) return custom;
  return `Mercy Dosa House ${product.name}`;
}

/** Category card images for homepage Browse Categories section */
export const CATEGORY_IMAGES: Record<string, string> = {
  dosa: '/images/plain-dosa.png',
  biryani: '/images/chicken-biryani.png',
  idly: '/images/idli-4-pieces.png',
  vada: '/images/vada-4-pieces.png',
};
