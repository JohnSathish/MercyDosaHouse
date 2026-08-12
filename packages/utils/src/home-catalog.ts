/**
 * Allocates menu products into homepage sections without duplicates.
 * Priority (exclusive — first match wins):
 * 1. Coming Soon  2. Pre-Order  3. Popular/Bestseller  4. Menu preview (remainder)
 *
 * Featured / On Offer flags surface as badges on cards, not separate product carousels,
 * so a small menu never looks artificially large.
 */

export interface HomeCatalogProduct {
  id: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isOnOffer?: boolean;
  isPreOrder?: boolean;
  isComingSoon?: boolean;
}

export interface HomeCatalogOptions {
  popularLimit?: number;
  menuPreviewLimit?: number;
  comingSoonLimit?: number;
  preOrderLimit?: number;
  /** When false, skip "Recommended" entirely (default). */
  includeRecommended?: boolean;
  minOrdersForRecommended?: number;
  orderCount?: number;
}

export interface HomeCatalogAllocation<T extends HomeCatalogProduct = HomeCatalogProduct> {
  comingSoon: T[];
  preOrder: T[];
  popular: T[];
  menuPreview: T[];
  /** Empty unless orderCount threshold met and includeRecommended. */
  recommended: T[];
  usedIds: Set<string>;
}

const DEFAULTS: Required<
  Omit<HomeCatalogOptions, 'orderCount' | 'minOrdersForRecommended' | 'includeRecommended'>
> &
  Pick<HomeCatalogOptions, 'includeRecommended' | 'minOrdersForRecommended' | 'orderCount'> = {
  popularLimit: 4,
  menuPreviewLimit: 6,
  comingSoonLimit: 6,
  preOrderLimit: 6,
  includeRecommended: false,
  minOrdersForRecommended: 50,
  orderCount: 0,
};

function takeExclusive<T extends HomeCatalogProduct>(
  source: T[],
  used: Set<string>,
  predicate: (p: T) => boolean,
  limit: number,
): T[] {
  const out: T[] = [];
  for (const p of source) {
    if (out.length >= limit) break;
    if (used.has(p.id)) continue;
    if (!predicate(p)) continue;
    used.add(p.id);
    out.push(p);
  }
  return out;
}

/** Filter to sellable items for main catalog (coming soon stays visible separately). */
export function availableForSale<T extends HomeCatalogProduct>(products: T[]): T[] {
  return products.filter((p) => p.isAvailable !== false && !p.isComingSoon);
}

export function allocateHomeCatalog<T extends HomeCatalogProduct>(
  products: T[],
  options: HomeCatalogOptions = {},
): HomeCatalogAllocation<T> {
  const opts = { ...DEFAULTS, ...options };
  const used = new Set<string>();

  // Coming soon may be unavailable — still show in that section only
  const comingSoon = takeExclusive(products, used, (p) => !!p.isComingSoon, opts.comingSoonLimit!);

  const sellable = availableForSale(products);

  const preOrder = takeExclusive(sellable, used, (p) => !!p.isPreOrder, opts.preOrderLimit!);

  const popular = takeExclusive(
    sellable,
    used,
    (p) => !!p.isPopular || !!p.isBestseller,
    opts.popularLimit!,
  );

  const menuPreview = takeExclusive(sellable, used, () => true, opts.menuPreviewLimit!);

  let recommended: T[] = [];
  const allowRecommended =
    opts.includeRecommended === true &&
    (opts.orderCount ?? 0) >= (opts.minOrdersForRecommended ?? 50);

  if (allowRecommended) {
    recommended = takeExclusive(sellable, used, (p) => !!p.isFeatured && !p.isPopular, 4);
  }

  return { comingSoon, preOrder, popular, menuPreview, recommended, usedIds: used };
}

export function productHomeBadge(p: HomeCatalogProduct): string | undefined {
  if (p.isComingSoon) return 'Coming Soon';
  if (p.isPreOrder) return 'Pre-Order';
  if (p.isOnOffer) return 'Offer';
  if (p.isBestseller) return 'Bestseller';
  if (p.isPopular) return 'Popular';
  if (p.isFeatured) return 'Featured';
  return undefined;
}
