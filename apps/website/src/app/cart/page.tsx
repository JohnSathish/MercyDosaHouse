'use client';

import Link from 'next/link';
import { Button, Card, CardContent } from '@mdh/ui';
import { formatCurrency, calculateOrderTotal } from '@mdh/utils';
import { useCartStore } from '@/lib/cart-store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

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
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/menu">
          <Button>Browse Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary mb-8">Your Cart</h1>
      <div className="space-y-4 mb-8">
        {items.map((item) => {
          const price = item.variantId
            ? item.product.variants?.find((v) => v.id === item.variantId)?.price ||
              item.product.price
            : item.product.price;
          return (
            <Card key={`${item.productId}-${item.variantId}`}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{item.product.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatCurrency(price)} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1, item.variantId)
                    }
                  >
                    −
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1, item.variantId)
                    }
                  >
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(sub)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatCurrency(delivery)}</span>
          </div>
          <div className="flex justify-between">
            <span>Packing</span>
            <span>{formatCurrency(packing)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Grand Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
          <Link href="/checkout" className="block mt-4">
            <Button className="w-full" size="lg">
              Proceed to Checkout
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
