import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductDto } from '@mdh/types';
import { calculatePackedItemCount, calculatePackingTotal } from '@mdh/utils';

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product: ProductDto;
}

interface CartState {
  items: CartItem[];
  addItem: (product: ProductDto, variantId?: string, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  mergeItems: (incoming: CartItem[]) => void;
  totalItems: () => number;
  subtotal: () => number;
  packingTotal: () => number;
  packedItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, variantId, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id && i.variantId === variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id && i.variantId === variantId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          });
        } else {
          set({
            items: [...items, { productId: product.id, variantId, quantity, product }],
          });
        }
      },
      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        });
      },
      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i,
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      mergeItems: (incoming) => {
        const current = get().items;
        const merged = [...current];
        for (const item of incoming) {
          const idx = merged.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + item.quantity };
          } else {
            merged.push(item);
          }
        }
        set({ items: merged });
      },
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => {
          const price = i.variantId
            ? i.product.variants?.find((v) => v.id === i.variantId)?.price || i.product.price
            : i.product.price;
          return sum + price * i.quantity;
        }, 0),
      packingTotal: () =>
        calculatePackingTotal(
          get().items.map((i) => ({
            quantity: i.quantity,
            packingCharge: i.product.packingCharge ?? 20,
          })),
        ),
      packedItemCount: () => calculatePackedItemCount(get().items),
    }),
    { name: 'mdh-cart' },
  ),
);
