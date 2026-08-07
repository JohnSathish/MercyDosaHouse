'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Textarea, Select } from '@mdh/ui';
import { formatCurrency, calculateOrderTotal } from '@mdh/utils';
import { createOrderSchema, PaymentMethod } from '@mdh/types';
import type { CreateOrderInput } from '@mdh/types';
import { useCartStore } from '@/lib/cart-store';
import { api } from '@/lib/api';
import type { BusinessSettingsDto, OrderDto } from '@mdh/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDto | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { paymentMethod: PaymentMethod.COD },
  });

  const paymentMethod = watch('paymentMethod');
  const sub = subtotal();
  const delivery = settings?.deliveryCharge || 30;
  const packing = settings?.packingCharge || 10;
  const total = calculateOrderTotal(sub, delivery, packing);

  const onSubmit = async (data: CreateOrderInput) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      };
      const result = await api.post<OrderDto>('/orders', payload);
      clearCart();
      setOrder(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !order) {
    router.push('/cart');
    return null;
  }

  if (order) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-primary mb-2">Order Placed!</h1>
        <p className="text-muted-foreground mb-4">Your order number is</p>
        <p className="text-3xl font-bold mb-6">{order.orderNumber}</p>
        <p className="mb-4">Total: {formatCurrency(order.grandTotal)}</p>
        {paymentMethod === PaymentMethod.UPI && settings?.upiQrUrl && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="font-semibold mb-2">Pay via UPI</p>
              <p className="text-sm text-muted-foreground">UPI ID: {settings.upiId}</p>
            </CardContent>
          </Card>
        )}
        <Button onClick={() => router.push(`/track/${order.orderNumber}`)}>Track Order</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Delivery Details</h2>
            <div>
              <Label htmlFor="customerName">Name</Label>
              <Input id="customerName" {...register('customerName')} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input id="customerPhone" {...register('customerPhone')} placeholder="9876543210" />
              {errors.customerPhone && (
                <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="line1">Address</Label>
              <Input id="line1" {...register('address.line1')} />
            </div>
            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" {...register('address.landmark')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('address.city')} />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" {...register('address.pincode')} />
              </div>
            </div>
            <div>
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Textarea id="deliveryInstructions" {...register('deliveryInstructions')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg">Payment Method</h2>
            <Select {...register('paymentMethod')}>
              <option value={PaymentMethod.COD}>Cash on Delivery</option>
              <option value={PaymentMethod.UPI}>UPI QR</option>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button type="submit" className="w-full mt-4" size="lg" disabled={loading}>
              {loading ? 'Placing Order...' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
