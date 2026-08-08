'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@mdh/ui';
import { formatCurrency, calculateOrderTotal } from '@mdh/utils';
import { isAuthenticated } from '@mdh/auth-client';
import { useCartStore } from '@/lib/cart-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';
import { getProductImage } from '@/lib/product-images';
import { getCheckoutEntryHref } from '@/lib/auth-redirect';

interface CartContentProps {
  onCheckout?: () => void;
  compact?: boolean;
}

export function CartContent({ onCheckout, compact }: CartContentProps) {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();
  const [checkoutHref, setCheckoutHref] = useState('/login?redirect=/checkout');

  useEffect(() => {
    setCheckoutHref(getCheckoutEntryHref(isAuthenticated()));
  }, []);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const sub = subtotal();
  const delivery = settings?.deliveryCharge || 30;
  const packing = settings?.packingCharge || 10;
  const total = calculateOrderTotal(sub, delivery, packing);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <span className="text-5xl mb-4">🛒</span>
        <h3 className="text-lg font-bold text-[#14532D] mb-2">Your cart is empty</h3>
        <p className="text-sm text-gray-500 mb-6">Add delicious dosas & biryani to get started</p>
        <Link href="/menu" onClick={onCheckout}>
          <Button className="min-h-[48px] px-8 rounded-2xl bg-[#14532D]">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={compact ? 'pb-4' : 'pb-8'}>
      <div className="space-y-3 px-1">
        {items.map((item) => {
          const price = item.variantId
            ? item.product.variants?.find((v) => v.id === item.variantId)?.price ||
              item.product.price
            : item.product.price;
          const lineTotal = price * item.quantity;

          return (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="flex gap-3 rounded-2xl bg-[#FFF8E8] p-3 border border-[#14532D]/5"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl food-gradient">
                <Image
                  src={getProductImage(item.product)}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-[#1F2937] line-clamp-1">
                  {item.product.name}
                </h3>
                <p className="text-xs text-gray-500">{formatCurrency(price)} each</p>
                <p className="text-sm font-bold text-[#14532D] mt-0.5">
                  {formatCurrency(lineTotal)}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1, item.variantId)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg active:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1, item.variantId)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg active:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-white border border-gray-100 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span>{formatCurrency(sub)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Delivery</span>
          <span>{formatCurrency(delivery)}</span>
        </div>
        {!compact && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Packing</span>
            <span>{formatCurrency(packing)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg pt-2 border-t border-dashed">
          <span>Total</span>
          <span className="text-[#14532D]">{formatCurrency(total)}</span>
        </div>
        <Link href={checkoutHref} onClick={onCheckout} className="block pt-2">
          <Button
            size="lg"
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] text-white font-semibold shadow-lg active:scale-[0.98] transition-transform"
          >
            Checkout · {formatCurrency(total)}
          </Button>
        </Link>
      </div>
    </div>
  );
}
