import type { OrderDto, ProductDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart-store';

export async function reorderOrderToCart(
  order: OrderDto,
): Promise<{ added: number; skipped: string[] }> {
  const addItem = useCartStore.getState().addItem;
  let added = 0;
  const skipped: string[] = [];

  for (const item of order.items) {
    try {
      const product = await api.get<ProductDto>(`/products/${item.productId}`);
      if (product.isAvailable === false) {
        skipped.push(item.productName);
        continue;
      }
      addItem(product, item.variantId ?? undefined, item.quantity);
      added += 1;
    } catch {
      skipped.push(item.productName);
    }
  }

  return { added, skipped };
}
