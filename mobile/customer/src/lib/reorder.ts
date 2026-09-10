import type { OrderDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';

export async function reorderOrderToCart(
  order: OrderDto,
): Promise<{ added: number; skipped: string[] }> {
  const addItem = useCartStore.getState().addItem;
  let added = 0;
  const skipped: string[] = [];

  for (const item of order.items) {
    try {
      const product = await api.get<{
        id: string;
        name: string;
        price: number;
        isAvailable?: boolean;
        packingCharge?: number;
      }>(`/products/${item.productId}`);
      if (product.isAvailable === false) {
        skipped.push(item.productName);
        continue;
      }
      addItem(
        {
          productId: item.productId,
          variantId: item.variantId,
          name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
          price: product.price ?? item.unitPrice,
          packingCharge: product.packingCharge ?? item.unitPackingCharge,
        },
        item.quantity,
      );
      added += 1;
    } catch {
      skipped.push(item.productName);
    }
  }

  return { added, skipped };
}
