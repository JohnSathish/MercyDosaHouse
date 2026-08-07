import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductDto } from '@mdh/types';

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  product: ProductDto;
}

interface CartState {
  items: CartItem[];
  addItem: (product: ProductDto, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, variantId) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id && i.variantId === variantId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id && i.variantId === variantId
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            ),
          });
        } else {
          set({ items: [...items, { productId: product.id, variantId, quantity: 1, product }] });
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
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => {
          const price = i.variantId
            ? i.product.variants?.find((v) => v.id === i.variantId)?.price || i.product.price
            : i.product.price;
          return sum + price * i.quantity;
        }, 0),
    }),
    { name: 'mdh-cart' },
  ),
);
