'use client';

import { useCartStore } from '@/lib/cart-store';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin } from 'lucide-react';
import { Button, Card, CardContent, Input, Label, Textarea, Select } from '@mdh/ui';
import { formatCurrency, calculateOrderTotal } from '@mdh/utils';
import { checkoutFormSchema, PaymentMethod } from '@mdh/types';
import type { CheckoutFormInput, OrderDto, AddressDto, BusinessSettingsDto } from '@mdh/types';
import { getStoredUser, isAuthenticated } from '@mdh/auth-client';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import { saveLastOrder } from '@/lib/last-order';

function fieldClass(hasError: boolean) {
  return hasError ? 'border-destructive ring-1 ring-destructive/30' : '';
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.subtotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const toast = useToastStore((s) => s.show);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const authed = isAuthenticated();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ name?: string | null; phone?: string | null }>('/users/me'),
    enabled: authed,
  });

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => api.get<AddressDto[]>('/users/me/addresses'),
    enabled: authed,
  });

  const defaultAddress = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0];

  const storedUser = getStoredUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      paymentMethod: PaymentMethod.COD,
      customerName: storedUser?.name || '',
      customerPhone: storedUser?.phone || '',
      address: {
        contactName: storedUser?.name || '',
        mobileNumber: storedUser?.phone || '',
        line1: '',
        city: '',
        state: 'Meghalaya',
        pincode: '',
      },
    },
  });

  useEffect(() => {
    if (!authed) return;

    reset((current) => ({
      ...current,
      customerName: defaultAddress?.contactName || profile?.name || current.customerName,
      customerPhone: defaultAddress?.mobileNumber || profile?.phone || current.customerPhone,
      address: defaultAddress
        ? {
            contactName: defaultAddress.contactName,
            mobileNumber: defaultAddress.mobileNumber,
            label: defaultAddress.label || '',
            line1: defaultAddress.line1,
            line2: defaultAddress.line2 || '',
            landmark: defaultAddress.landmark || '',
            city: defaultAddress.city,
            state: defaultAddress.state || 'Meghalaya',
            pincode: defaultAddress.pincode,
            deliveryNotes: defaultAddress.deliveryNotes || '',
          }
        : current.address,
      deliveryInstructions: defaultAddress?.deliveryNotes || current.deliveryInstructions,
    }));
  }, [authed, profile, defaultAddress, reset]);

  const sub = getSubtotal();
  const delivery = settings?.deliveryCharge || 30;
  const packing = settings?.packingCharge || 10;
  const total = calculateOrderTotal(sub, delivery, packing);

  useEffect(() => {
    if (items.length === 0 && !redirecting) {
      router.replace('/cart');
    }
  }, [items.length, redirecting, router]);

  const onInvalid = () => {
    toast('❌ Please fill in all required fields correctly.');
  };

  const onSubmit = async (data: CheckoutFormInput) => {
    if (items.length === 0) {
      toast('❌ Your cart is empty.');
      router.replace('/cart');
      return;
    }

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
      saveLastOrder(result);
      clearCart();
      setRedirecting(true);
      router.push(`/order/success?order=${encodeURIComponent(result.orderNumber)}`);
    } catch (err) {
      toast('❌ Unable to place your order. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Redirecting to cart...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 lg:py-8 max-w-2xl pb-32 lg:pb-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>
      <form
        id="checkout-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="space-y-6"
        noValidate
      >
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">Delivery Details</h2>
              {authed && defaultAddress && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D] bg-[#14532D]/10 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  Saved address
                </span>
              )}
            </div>
            {authed && !defaultAddress && (
              <p className="text-sm text-muted-foreground">
                No saved address yet — add one in your profile for faster checkout next time.
              </p>
            )}
            <div>
              <Label htmlFor="customerName">Name *</Label>
              <Input
                id="customerName"
                {...register('customerName')}
                className={fieldClass(!!errors.customerName)}
                aria-invalid={!!errors.customerName}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone *</Label>
              <Input
                id="customerPhone"
                {...register('customerPhone')}
                placeholder="9876543210"
                className={fieldClass(!!errors.customerPhone)}
                aria-invalid={!!errors.customerPhone}
              />
              {errors.customerPhone && (
                <p className="text-sm text-destructive mt-1">{errors.customerPhone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="line1">Address *</Label>
              <Input
                id="line1"
                {...register('address.line1')}
                className={fieldClass(!!errors.address?.line1)}
                aria-invalid={!!errors.address?.line1}
              />
              {errors.address?.line1 && (
                <p className="text-sm text-destructive mt-1">{errors.address.line1.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input id="landmark" {...register('address.landmark')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('address.city')}
                  className={fieldClass(!!errors.address?.city)}
                  aria-invalid={!!errors.address?.city}
                />
                {errors.address?.city && (
                  <p className="text-sm text-destructive mt-1">{errors.address.city.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  {...register('address.pincode')}
                  placeholder="600001"
                  className={fieldClass(!!errors.address?.pincode)}
                  aria-invalid={!!errors.address?.pincode}
                />
                {errors.address?.pincode && (
                  <p className="text-sm text-destructive mt-1">{errors.address.pincode.message}</p>
                )}
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
            <h2 className="font-semibold text-lg">Payment Method *</h2>
            <Select
              {...register('paymentMethod')}
              className={fieldClass(!!errors.paymentMethod)}
              aria-invalid={!!errors.paymentMethod}
            >
              <option value={PaymentMethod.COD}>Cash on Delivery</option>
              <option value={PaymentMethod.UPI}>UPI QR</option>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(sub)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatCurrency(delivery)}</span>
              </div>
              {packing > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packing</span>
                  <span>{formatCurrency(packing)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button
              type="submit"
              className="w-full mt-4 bg-[#14532D] hover:bg-[#14532D]/90 hidden lg:flex"
              size="lg"
              disabled={loading || redirecting}
            >
              {loading || redirecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Mobile sticky checkout bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 safe-area-pb shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-[#14532D]">{formatCurrency(total)}</p>
          </div>
          <Button
            type="submit"
            form="checkout-form"
            className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] font-semibold active:scale-[0.98] transition-transform"
            disabled={loading || redirecting}
          >
            {loading || redirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
