import { FoodCard, type FoodCardProduct } from '@/ui';

/** Back-compat wrapper — prefer FoodCard directly. */
export function ProductRow({
  product,
  showFavorite,
}: {
  product: FoodCardProduct;
  showFavorite?: boolean;
}) {
  return <FoodCard product={product} showFavorite={showFavorite} />;
}
