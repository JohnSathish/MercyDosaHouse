import { create } from 'zustand';
import { calculatePackingTotal } from '@mdh/utils';

export interface CartLine {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  packingCharge?: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
}

function lineKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? ''}`;
}

interface CartState {
  items: CartLine[];
  addItem: (item: Omit<CartLine, 'quantity'>, qty?: number) => void;
  removeItem: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  updateNotes: (productId: string, notes: string, variantId?: string | null) => void;
  clear: () => void;
  subtotal: () => number;
  packingTotal: () => number;
  itemCount: () => number;
  toOrderItems: () => { productId: string; variantId?: string; quantity: number }[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item, qty = 1) =>
    set((state) => {
      const key = lineKey(item.productId, item.variantId);
      const existing = state.items.find((i) => lineKey(i.productId, i.variantId) === key);
      if (existing) {
        return {
          items: state.items.map((i) =>
            lineKey(i.productId, i.variantId) === key ? { ...i, quantity: i.quantity + qty } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: qty }] };
    }),
  removeItem: (productId, variantId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => lineKey(i.productId, i.variantId) !== lineKey(productId, variantId),
      ),
    })),
  updateQuantity: (productId, quantity, variantId) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter(
              (i) => lineKey(i.productId, i.variantId) !== lineKey(productId, variantId),
            )
          : state.items.map((i) =>
              lineKey(i.productId, i.variantId) === lineKey(productId, variantId)
                ? { ...i, quantity }
                : i,
            ),
    })),
  updateNotes: (productId, notes, variantId) =>
    set((state) => ({
      items: state.items.map((i) =>
        lineKey(i.productId, i.variantId) === lineKey(productId, variantId) ? { ...i, notes } : i,
      ),
    })),
  clear: () => set({ items: [] }),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  packingTotal: () =>
    calculatePackingTotal(
      get().items.map((i) => ({ quantity: i.quantity, packingCharge: i.packingCharge ?? 20 })),
    ),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  toOrderItems: () =>
    get().items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId ?? undefined,
      quantity: i.quantity,
    })),
}));
