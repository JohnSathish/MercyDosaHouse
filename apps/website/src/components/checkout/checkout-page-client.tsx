'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  CreditCard,
  Tag,
  Gift,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  User,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import {
  formatCurrency,
  calculatePreOrderDiscount,
  buildScheduledDeliveryIso,
  getScheduleDateOptions,
  firstPreOrderDate,
  formatPromotionTime,
  formatPackingLabel,
  PAYMENT_METHOD_LABELS,
} from '@mdh/utils';
import { useOrderCharges } from '@/hooks/use-order-charges';
import { AddressType, DELIVERY_TIME_SLOTS, PAYMENT_OPTIONS } from '@mdh/types';
import type { OnlineOrderType } from '@mdh/utils';
import type {
  AddressDto,
  BusinessSettingsDto,
  CheckoutProfileDto,
  AvailableCouponDto,
  OrderDto,
} from '@mdh/types';
import {
  isAuthenticated,
  getStoredUser,
  getAccessToken,
  getRefreshToken,
  storeAuth,
} from '@mdh/auth-client';
import {
  isGenericCustomerName,
  resolveCheckoutCustomerName,
  resolveCustomerDisplayName,
} from '@/components/dashboard/types';
import { useCartStore } from '@/lib/cart-store';
import { useCheckoutStore } from '@/lib/checkout-store';
import { api } from '@/lib/api';
import { userQueryKey, clearUserSessionQueries } from '@/lib/auth-queries';
import { useMarketing } from '@/components/marketing/marketing-provider';
import { useToastStore } from '@/lib/toast-store';
import { useRestaurantStatus } from '@/lib/restaurant-status-context';
import { saveLastOrder } from '@/lib/last-order';
import { CheckoutLoginSheet } from './checkout-login-sheet';
import { AddressFormDialog } from '@/components/dashboard/address-form-dialog';
import { checkDeliveryArea } from '@/lib/marketing-content';
import { DeliveryPopupTrigger } from '@/components/marketing/delivery-popup';
import { DeliveryNoticeBody } from '@/components/marketing/delivery-notice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const LocationPickerMap = dynamic(
  () => import('@/components/maps/location-picker-map').then((module) => module.LocationPickerMap),
  { ssr: false },
);

function CheckoutSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: typeof MapPin;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-[#FFF8E8]/50 hover:bg-[#FFF8E8] transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-[#14532D]">
          <Icon className="h-4 w-4" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 border-t">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ADDRESS_ICONS: Record<string, string> = {
  [AddressType.HOME]: '🏠',
  [AddressType.OFFICE]: '🏢',
  [AddressType.OTHER]: '📍',
};

export function CheckoutPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { isOpen: storeOpen, orderBlockedMessage } = useRestaurantStatus();

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const getSubtotal = useCartStore((s) => s.subtotal);
  const packingTotalFn = useCartStore((s) => s.packingTotal);
  const packedItemCountFn = useCartStore((s) => s.packedItemCount);
  const clearCart = useCartStore((s) => s.clearCart);

  const session = useCheckoutStore();
  const marketing = useMarketing();
  const promotionSlug = searchParams.get('product');
  const promotionId = searchParams.get('promotion');
  const promotionProductAdded = useRef<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const checkoutUserId = authed ? getStoredUser()?.id : undefined;
  const [loginOpen, setLoginOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [manualCoupon, setManualCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, [loginOpen]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
  });

  const { data: promotionProduct } = useQuery({
    queryKey: ['checkout-promotion-product', promotionSlug],
    queryFn: () => api.get<import('@mdh/types').ProductDto>(`/products/slug/${promotionSlug}`),
    enabled: Boolean(promotionSlug),
    staleTime: 60_000,
  });

  const linkedPromotion = useMemo(
    () =>
      marketing?.announcements?.find(
        (item) =>
          (promotionId ? item.id === promotionId : false) ||
          (promotionProduct?.id != null && item.promotionProductId === promotionProduct.id),
      ) ?? null,
    [marketing?.announcements, promotionId, promotionProduct?.id],
  );

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: userQueryKey('checkout-profile', checkoutUserId),
    queryFn: () => api.get<CheckoutProfileDto>('/users/me/checkout-profile'),
    enabled: authed,
    staleTime: 60_000,
  });

  const [deliveryCheck, setDeliveryCheck] = useState<{
    available: boolean;
    message: string;
    expansionMessage?: string | null;
  } | null>(null);
  const [deliveryPopupOpen, setDeliveryPopupOpen] = useState(false);
  const [deliveryNoticeAcked, setDeliveryNoticeAcked] = useState(false);
  const pickupOnly = Boolean(deliveryCheck && !deliveryCheck.available);
  const orderType: OnlineOrderType = pickupOnly ? 'ONLINE_PICKUP' : 'DELIVERY';

  const sub = getSubtotal();
  const packing = packingTotalFn();
  const packedCount = packedItemCountFn();
  const rewardDiscount = session.rewardPointsToUse;

  const preOrderConfig = useMemo(
    () => ({
      discountPct: settings?.preOrderDiscountPct ?? 10,
      minDaysAhead: settings?.preOrderMinDaysAhead ?? 1,
      stackWithCoupons: settings?.preOrderStackWithCoupons ?? false,
    }),
    [settings],
  );

  const scheduleDates = useMemo(
    () => getScheduleDateOptions(7, new Date(), preOrderConfig),
    [preOrderConfig],
  );

  const promotionScheduleDates = useMemo(() => {
    if (!linkedPromotion?.promotionNextAvailableDate) return scheduleDates;
    const existing = scheduleDates.find(
      (option) => option.value === linkedPromotion.promotionNextAvailableDate,
    );
    return [
      existing ?? {
        value: linkedPromotion.promotionNextAvailableDate,
        label:
          linkedPromotion.promotionNextAvailableLabel ?? linkedPromotion.promotionNextAvailableDate,
        qualifiesForPreOrder: true,
      },
    ];
  }, [linkedPromotion, scheduleDates]);

  const hasPromotionItem = items.some(
    (item) =>
      item.product.isPreOrder &&
      (!linkedPromotion || item.productId === linkedPromotion.promotionProductId),
  );
  const mustSchedule = items.some((item) => item.product.isPreOrder);

  const scheduledIso = useMemo(() => {
    if (
      session.deliveryTiming !== 'scheduled' ||
      !session.scheduledDate ||
      !session.scheduledSlot
    ) {
      return null;
    }
    return buildScheduledDeliveryIso(session.scheduledDate, session.scheduledSlot) ?? null;
  }, [session.deliveryTiming, session.scheduledDate, session.scheduledSlot]);

  const preOrderDiscount = useMemo(
    () => calculatePreOrderDiscount(sub, scheduledIso, preOrderConfig),
    [sub, scheduledIso, preOrderConfig],
  );

  const preOrderActive = preOrderDiscount > 0;
  const couponsBlocked = preOrderActive && !preOrderConfig.stackWithCoupons;

  const totalDiscount = preOrderDiscount + couponDiscount + rewardDiscount;
  const charges = useOrderCharges(sub, packing, orderType, totalDiscount);
  const { delivery, deliveryIsFree, total: clientTotal } = charges;

  const quoteItems = useMemo(
    () =>
      items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    [items],
  );

  const { data: serverQuote } = useQuery({
    queryKey: [
      'order-quote',
      quoteItems,
      couponsBlocked ? null : session.couponCode,
      scheduledIso,
      session.rewardPointsToUse,
      orderType,
    ],
    queryFn: () =>
      api.post<{
        grandTotal: number;
        subtotal: number;
        deliveryCharge: number;
        packingCharge: number;
        preOrderDiscount: number;
        couponDiscount: number;
        rewardDiscount: number;
      }>('/orders/quote', {
        items: quoteItems,
        couponCode: couponsBlocked ? undefined : session.couponCode,
        scheduledDeliveryAt: scheduledIso ?? undefined,
        rewardPointsUsed: session.rewardPointsToUse || undefined,
        orderType,
      }),
    enabled: quoteItems.length > 0,
    staleTime: 10_000,
  });

  const grandTotal = serverQuote?.grandTotal ?? clientTotal;

  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['coupons-available', sub],
    queryFn: () => api.get<AvailableCouponDto[]>(`/coupons/available?subtotal=${sub}`),
    enabled: sub > 0,
  });

  const selectedAddress = useMemo(() => {
    if (!profile?.addresses?.length) return null;
    if (session.selectedAddressId) {
      return profile.addresses.find((a) => a.id === session.selectedAddressId) ?? null;
    }
    return profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0];
  }, [profile, session.selectedAddressId]);

  useEffect(() => {
    const addr = selectedAddress ?? session.guestAddressDraft;
    if (!addr?.line1) {
      setDeliveryCheck(null);
      return;
    }
    const text = [addr.line1, addr.line2, addr.landmark, addr.city || 'Tura', addr.pincode]
      .filter(Boolean)
      .join(' ');
    checkDeliveryArea(text, addr.pincode).then((result) => {
      setDeliveryCheck(result);
      if (!result.available && !deliveryNoticeAcked) setDeliveryPopupOpen(true);
    });
  }, [selectedAddress, session.guestAddressDraft, deliveryNoticeAcked]);

  async function syncProfileNameFromContact(contactName?: string | null) {
    const name = contactName?.trim();
    if (!name || isGenericCustomerName(name) || !isGenericCustomerName(profile?.name)) return;
    try {
      await api.patch('/users/me', { name });
      const stored = getStoredUser();
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (stored && accessToken && refreshToken) {
        storeAuth({ accessToken, refreshToken }, { ...stored, name });
      }
      queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch {
      /* profile sync is best-effort */
    }
  }

  useEffect(() => {
    if (!profile) return;
    if (profile.preferredPayment && !session.paymentMethod) {
      session.setPaymentMethod(profile.preferredPayment);
    } else if (profile.preferredPayment) {
      session.setPaymentMethod(profile.preferredPayment);
    }
    const defaultAddr = profile.addresses.find((a) => a.isDefault) ?? profile.addresses[0];
    if (defaultAddr?.id && !session.selectedAddressId) {
      session.setSelectedAddressId(defaultAddr.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (
      (searchParams.get('preorder') === '1' || mustSchedule) &&
      session.deliveryTiming === 'now'
    ) {
      session.setDeliveryTiming('scheduled');
      const first = firstPreOrderDate(hasPromotionItem ? promotionScheduleDates : scheduleDates);
      if (first) session.setScheduledDate(first);
      if (!session.scheduledSlot) {
        const readyTime = linkedPromotion?.promotionReadyTime
          ? formatPromotionTime(linkedPromotion.promotionReadyTime)
          : '8:00 AM';
        session.setScheduledSlot(
          DELIVERY_TIME_SLOTS.find((slot) => slot.startsWith(readyTime)) ?? '8:00 AM - 9:00 AM',
        );
      }
    }
  }, [
    searchParams,
    scheduleDates,
    hasPromotionItem,
    promotionScheduleDates,
    linkedPromotion,
    mustSchedule,
  ]);

  useEffect(() => {
    if (!promotionProduct || promotionProductAdded.current === promotionProduct.id) return;
    if (!items.some((item) => item.productId === promotionProduct.id)) {
      addItem(promotionProduct);
    }
    promotionProductAdded.current = promotionProduct.id;
  }, [addItem, items, promotionProduct]);

  useEffect(() => {
    if (couponsBlocked && session.couponCode) {
      session.setCouponCode(null);
      setCouponDiscount(0);
    }
  }, [couponsBlocked, session.couponCode]);

  useEffect(() => {
    if (couponsBlocked) return;
    if (availableCoupons.length && !session.couponCode) {
      const best = availableCoupons[0];
      session.setCouponCode(best.code);
      setCouponDiscount(best.discount);
    }
  }, [availableCoupons, couponsBlocked]);

  useEffect(() => {
    if (items.length === 0 && !redirecting) router.replace('/cart');
  }, [items.length, redirecting, router]);

  async function applyCoupon(code: string) {
    if (couponsBlocked) {
      toast('Pre-order discount cannot be combined with coupon codes.');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await api.post<{ discount: number; coupon: { code: string } }>(
        '/coupons/validate',
        { code, subtotal: sub },
      );
      session.setCouponCode(res.coupon.code);
      setCouponDiscount(res.discount);
      toast(`Coupon ${code} applied — saved ${formatCurrency(res.discount)}`);
    } catch {
      toast('Invalid or ineligible coupon');
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function saveAddress(values: Record<string, unknown>, addressId?: string) {
    try {
      if (addressId) {
        try {
          await api.patch(`/users/me/addresses/${addressId}`, values);
        } catch (err) {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('Address not found')) {
            const created = await api.post<AddressDto>('/users/me/addresses', {
              ...values,
              isDefault: profile?.addresses.length === 0,
            });
            if (created.id) session.setSelectedAddressId(created.id);
            queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
            setAddressDialogOpen(false);
            setEditingAddress(null);
            toast('Address saved as new — please refresh if you still see old entries.');
            return;
          }
          throw err;
        }
      } else {
        const created = await api.post<AddressDto>('/users/me/addresses', {
          ...values,
          isDefault: profile?.addresses.length === 0,
        });
        if (created.id) session.setSelectedAddressId(created.id);
      }
      queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
      setAddressDialogOpen(false);
      setEditingAddress(null);
      await syncProfileNameFromContact(String(values.contactName ?? ''));
      toast('Address saved');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save address');
      throw err;
    }
  }

  async function deleteAddress(id: string) {
    await api.delete(`/users/me/addresses/${id}`);
    queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
    if (session.selectedAddressId === id) session.setSelectedAddressId(null);
    toast('Address removed');
  }

  async function setDefaultAddress(id: string) {
    await api.patch(`/users/me/addresses/${id}`, { isDefault: true });
    queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
    session.setSelectedAddressId(id);
  }

  function buildScheduledIso(): string | undefined {
    if (
      session.deliveryTiming !== 'scheduled' ||
      !session.scheduledDate ||
      !session.scheduledSlot
    ) {
      return undefined;
    }
    return buildScheduledDeliveryIso(session.scheduledDate, session.scheduledSlot);
  }

  async function placeOrder() {
    if (!storeOpen) {
      toast(orderBlockedMessage);
      return;
    }
    if (!items.length) return;

    if (
      session.deliveryTiming === 'scheduled' &&
      (!session.scheduledDate || !session.scheduledSlot)
    ) {
      toast('Please choose a delivery date and time slot');
      return;
    }

    const user = getStoredUser();
    let payload: Record<string, unknown>;
    let customerName = 'Guest';
    const couponCode = couponsBlocked ? undefined : session.couponCode;

    if (authed && selectedAddress?.id) {
      customerName = resolveCheckoutCustomerName(selectedAddress.contactName, profile?.name);
      payload = {
        customerName,
        customerPhone: profile?.phone || selectedAddress.mobileNumber,
        addressId: selectedAddress.id,
        paymentMethod: session.paymentMethod,
        couponCode,
        rewardPointsUsed: session.rewardPointsToUse,
        scheduledDeliveryAt: buildScheduledIso(),
        deliveryInstructions: selectedAddress.deliveryNotes,
        orderType,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      };
    } else if (session.guestAddressDraft?.line1) {
      const g = session.guestAddressDraft;
      if (!g.pincode || g.pincode.replace(/\D/g, '').length !== 6) {
        toast('Please enter a valid 6-digit pincode');
        return;
      }
      if (!g.mobileNumber || g.mobileNumber.replace(/\D/g, '').length < 10) {
        toast('Please enter a valid mobile number');
        return;
      }
      customerName = resolveCheckoutCustomerName(g.contactName, user?.name);
      payload = {
        customerName,
        customerPhone: g.mobileNumber.replace(/\D/g, '').slice(-10),
        address: {
          ...g,
          city: g.city || 'Tura',
          state: g.state || 'Meghalaya',
          pincode: g.pincode.replace(/\D/g, '').slice(0, 6),
          mobileNumber: g.mobileNumber.replace(/\D/g, '').slice(-10),
        },
        paymentMethod: session.paymentMethod,
        couponCode,
        scheduledDeliveryAt: buildScheduledIso(),
        orderType,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      };
    } else {
      toast(
        pickupOnly
          ? 'Please add your contact details for pickup'
          : 'Please select or add a delivery address',
      );
      return;
    }

    if (deliveryCheck && !deliveryCheck.available && orderType === 'DELIVERY') {
      toast(deliveryCheck.message);
      setDeliveryPopupOpen(true);
      return;
    }

    setPlacing(true);
    try {
      const result = await api.post<OrderDto>('/orders', payload);

      await syncProfileNameFromContact(customerName);

      saveLastOrder(result);
      clearCart();
      session.resetSession();
      setRedirecting(true);
      setConfirmOpen(false);
      router.push(`/order/success?order=${encodeURIComponent(result.orderNumber)}`);
    } catch {
      toast('Unable to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Redirecting to cart...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 lg:py-8 max-w-2xl pb-36 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#14532D]">Checkout</h1>
        {!authed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoginOpen(true)}
            className="rounded-xl gap-1.5 border-[#14532D]/30 text-[#14532D]"
          >
            <User className="h-4 w-4" /> Login
          </Button>
        )}
      </div>

      {authed && profile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl bg-gradient-to-r from-[#14532D]/10 to-emerald-50 border border-[#14532D]/10 p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold text-[#14532D]">
              {resolveCustomerDisplayName(
                profile.name,
                selectedAddress?.contactName,
                profile.phone,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile.phone} · {profile.loyaltyTier} · {profile.loyaltyPoints} pts
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-[#F59E0B]" />
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Address Section */}
        <CheckoutSection title="Delivery Address" icon={MapPin}>
          {authed && profileLoading ? (
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          ) : authed && profile?.addresses?.length ? (
            <div className="space-y-3">
              {profile.addresses.map((addr) => {
                const selected = selectedAddress?.id === addr.id;
                return (
                  <div
                    key={addr.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => addr.id && session.setSelectedAddressId(addr.id)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && addr.id && session.setSelectedAddressId(addr.id)
                    }
                    className={cn(
                      'rounded-xl border-2 p-3 cursor-pointer transition-all',
                      selected
                        ? 'border-[#14532D] bg-[#14532D]/5 shadow-sm'
                        : 'border-gray-100 hover:border-[#14532D]/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span>{ADDRESS_ICONS[addr.addressType ?? AddressType.HOME] ?? '📍'}</span>
                        <span className="font-semibold text-sm">
                          {addr.label || addr.addressType || 'Address'}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold uppercase bg-[#14532D]/10 text-[#14532D] px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      {selected && <CheckCircle2 className="h-4 w-4 text-[#14532D] shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city} — {addr.pincode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {addr.contactName} · {addr.mobileNumber}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddress(addr);
                          setAddressDialogOpen(true);
                        }}
                        className="text-xs text-[#14532D] flex items-center gap-0.5 hover:underline"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addr.id && setDefaultAddress(addr.id);
                          }}
                          className="text-xs text-gray-500 flex items-center gap-0.5 hover:underline"
                        >
                          <Star className="h-3 w-3" /> Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addr.id && deleteAddress(addr.id);
                        }}
                        className="text-xs text-red-500 flex items-center gap-0.5 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressDialogOpen(true);
                }}
                className="w-full rounded-xl gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" /> Add New Address
              </Button>
            </div>
          ) : authed ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No saved addresses yet</p>
              <Button
                onClick={() => setAddressDialogOpen(true)}
                className="rounded-xl bg-[#14532D] gap-2"
              >
                <Plus className="h-4 w-4" /> Add Delivery Address
              </Button>
            </div>
          ) : (
            <div>
              {!showGuestForm ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Login for saved addresses, or continue as guest
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setLoginOpen(true)} className="rounded-xl bg-[#14532D]">
                      Login
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowGuestForm(true);
                        if (!session.guestAddressDraft) {
                          session.setGuestAddressDraft({
                            city: 'Tura',
                            state: 'Meghalaya',
                            country: 'India',
                          });
                        }
                      }}
                      className="rounded-xl"
                    >
                      Enter address
                    </Button>
                  </div>
                </div>
              ) : (
                <GuestAddressForm
                  draft={session.guestAddressDraft}
                  onChange={session.setGuestAddressDraft}
                  profileName={getStoredUser()?.name}
                  profilePhone={getStoredUser()?.phone}
                />
              )}
            </div>
          )}
        </CheckoutSection>

        {deliveryCheck && (
          <div
            className={cn(
              'rounded-xl border p-3 text-sm',
              deliveryCheck.available
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
          >
            <DeliveryNoticeBody text={deliveryCheck.message} />
            {!deliveryCheck.available && (
              <p className="text-xs mt-1 font-semibold text-[#14532D]">
                You can still place a pickup order. Continue to confirm.
              </p>
            )}
            {!deliveryCheck.available &&
              deliveryCheck.expansionMessage &&
              deliveryCheck.expansionMessage.trim() !== deliveryCheck.message.trim() && (
                <DeliveryNoticeBody
                  text={deliveryCheck.expansionMessage}
                  className="mt-2 text-xs text-[#F59E0B]"
                />
              )}
          </div>
        )}

        {/* Delivery Time */}
        <CheckoutSection title="Schedule Order" icon={Clock}>
          <div className="flex gap-2 mb-3">
            {(['now', 'scheduled'] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={t === 'now' && mustSchedule}
                onClick={() => {
                  if (t === 'now' && mustSchedule) return;
                  session.setDeliveryTiming(t);
                  if (t === 'scheduled' && !session.scheduledDate) {
                    const first = firstPreOrderDate(
                      hasPromotionItem ? promotionScheduleDates : scheduleDates,
                    );
                    if (first) session.setScheduledDate(first);
                  }
                }}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                  t === 'now' && mustSchedule && 'cursor-not-allowed opacity-40',
                  session.deliveryTiming === t
                    ? 'border-[#14532D] bg-[#14532D]/5 text-[#14532D]'
                    : 'border-gray-100 text-gray-500',
                )}
              >
                {t === 'now' ? '⚡ Deliver Now' : '📅 Schedule Order'}
              </button>
            ))}
          </div>
          {session.deliveryTiming === 'now' ? (
            <div className="space-y-2">
              {mustSchedule ? (
                <p className="text-sm font-semibold text-amber-800">
                  This cart contains a pre-order item. Choose its available scheduled date below.
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Estimated delivery in <strong>25–35 min</strong>
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                💡 Schedule at least 1 day ahead to get{' '}
                <strong>{preOrderConfig.discountPct}% OFF</strong> on food items.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {preOrderActive && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {preOrderConfig.discountPct}% Pre-Order Discount Applied
                    </p>
                    <p className="text-xs text-emerald-700">
                      You save {formatCurrency(preOrderDiscount)} on food items
                    </p>
                  </div>
                </div>
              )}
              {!preOrderActive && session.scheduledDate && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  Select a date at least {preOrderConfig.minDaysAhead} day ahead to unlock{' '}
                  {preOrderConfig.discountPct}% off food items.
                </p>
              )}
              {hasPromotionItem && linkedPromotion ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  {linkedPromotion.promotionNextAvailableLabel || 'Upcoming promotion date'} at{' '}
                  {formatPromotionTime(linkedPromotion.promotionReadyTime)} · Pre-order required
                </p>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(hasPromotionItem ? promotionScheduleDates : scheduleDates).map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => session.setScheduledDate(d.value)}
                    className={cn(
                      'relative py-2 px-2 rounded-xl text-[11px] font-semibold border text-left',
                      session.scheduledDate === d.value
                        ? 'border-[#14532D] bg-[#14532D]/5 text-[#14532D]'
                        : 'border-gray-100',
                    )}
                  >
                    {d.label}
                    {d.qualifiesForPreOrder && (
                      <span className="block text-[9px] font-bold text-emerald-600 mt-0.5">
                        {preOrderConfig.discountPct}% OFF
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DELIVERY_TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => session.setScheduledSlot(slot)}
                    className={cn(
                      'py-2 px-2 rounded-xl text-[11px] font-medium border',
                      session.scheduledSlot === slot
                        ? 'border-[#14532D] bg-[#14532D]/5 text-[#14532D]'
                        : 'border-gray-100',
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CheckoutSection>

        {/* Payment */}
        <CheckoutSection title="Payment Method" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => session.setPaymentMethod(value)}
                className={cn(
                  'p-3 rounded-xl border-2 text-left transition-all',
                  session.paymentMethod === value
                    ? 'border-[#14532D] bg-[#14532D]/5'
                    : 'border-gray-100 hover:border-[#14532D]/20',
                )}
              >
                <span className="text-lg">{icon}</span>
                <p className="text-xs font-semibold mt-1 leading-tight">{label}</p>
              </button>
            ))}
          </div>
        </CheckoutSection>

        {/* Coupons */}
        <CheckoutSection
          title="Coupons & Offers"
          icon={Tag}
          defaultOpen={!!availableCoupons.length && !couponsBlocked}
        >
          {couponsBlocked ? (
            <p className="text-sm text-muted-foreground rounded-xl bg-[#FFF8E8] px-3 py-2 border border-[#14532D]/10">
              Pre-order discount is active. Coupon codes cannot be combined with this offer.
            </p>
          ) : (
            <>
              {availableCoupons.slice(0, 3).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => applyCoupon(c.code)}
                  className={cn(
                    'w-full text-left rounded-xl border p-3 mb-2 transition-all',
                    session.couponCode === c.code
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-100 hover:border-[#14532D]/30',
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#14532D]">{c.code}</span>
                    <span className="text-sm font-semibold text-emerald-600">
                      Save {formatCurrency(c.discount)}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                  )}
                </button>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  value={manualCoupon}
                  onChange={(e) => setManualCoupon(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={applyingCoupon || !manualCoupon}
                  onClick={() => applyCoupon(manualCoupon)}
                  className="rounded-xl"
                >
                  Apply
                </Button>
              </div>
            </>
          )}
        </CheckoutSection>

        {/* Rewards */}
        {authed && profile && profile.loyaltyPoints > 0 && (
          <CheckoutSection title="Reward Points" icon={Gift}>
            <p className="text-sm text-muted-foreground mb-2">
              Available: <strong>{profile.loyaltyPoints} points</strong> (1 pt = ₹1)
            </p>
            <input
              type="range"
              min={0}
              max={Math.min(
                profile.loyaltyPoints,
                sub + charges.delivery + packing - preOrderDiscount - couponDiscount,
              )}
              value={session.rewardPointsToUse}
              onChange={(e) => session.setRewardPointsToUse(Number(e.target.value))}
              className="w-full accent-[#14532D]"
            />
            <p className="text-sm font-semibold text-[#14532D] mt-1">
              Redeeming: {formatCurrency(session.rewardPointsToUse)}
            </p>
          </CheckoutSection>
        )}

        {/* Order Summary */}
        <CheckoutSection title="Order Summary" icon={CheckCircle2}>
          {items.map((item) => {
            const price = item.variantId
              ? (item.product.variants?.find((v) => v.id === item.variantId)?.price ??
                item.product.price)
              : item.product.price;
            return (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex justify-between text-sm py-1.5 border-b border-dashed last:border-0"
              >
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium">{formatCurrency(price * item.quantity)}</span>
              </div>
            );
          })}
          <div className="mt-3 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(sub)} />
            {preOrderDiscount > 0 && (
              <Row
                label={`Pre-Order Discount (${preOrderConfig.discountPct}%)`}
                value={`−${formatCurrency(preOrderDiscount)}`}
                green
              />
            )}
            <Row
              label="Delivery"
              value={deliveryIsFree ? 'Free Delivery' : formatCurrency(delivery)}
            />
            <Row label={formatPackingLabel(packedCount)} value={formatCurrency(packing)} />
            {couponDiscount > 0 && (
              <Row label="Coupon" value={`−${formatCurrency(couponDiscount)}`} green />
            )}
            {rewardDiscount > 0 && (
              <Row label="Reward Points" value={`−${formatCurrency(rewardDiscount)}`} green />
            )}
            {preOrderDiscount > 0 && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
                🎉 You saved {formatCurrency(preOrderDiscount)} by ordering one day in advance.
              </p>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Grand Total</span>
              <span className="text-[#14532D]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CheckoutSection>
      </div>

      {/* Desktop CTA */}
      <Button
        type="button"
        onClick={() => (storeOpen ? setConfirmOpen(true) : toast(orderBlockedMessage))}
        className="w-full mt-6 h-14 rounded-2xl bg-[#14532D] hover:bg-[#14532D]/90 text-lg font-semibold hidden lg:flex"
        disabled={placing || !storeOpen}
      >
        {storeOpen
          ? `Review & Place Order · ${formatCurrency(grandTotal)}`
          : 'Restaurant Closed — Orders Paused'}
      </Button>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t px-4 py-3 safe-area-pb shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1">
            <p className="text-xs text-gray-500">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xl font-bold text-[#14532D]">{formatCurrency(grandTotal)}</p>
          </div>
          <Button
            type="button"
            onClick={() => (storeOpen ? setConfirmOpen(true) : toast(orderBlockedMessage))}
            disabled={placing || !storeOpen}
            className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] font-semibold"
          >
            {placing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : storeOpen ? (
              'Place Order'
            ) : (
              'Closed'
            )}
          </Button>
        </div>
      </div>

      <CheckoutLoginSheet
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setAuthed(true);
          clearUserSessionQueries(queryClient);
        }}
      />
      <DeliveryPopupTrigger
        open={deliveryPopupOpen}
        onClose={() => {
          setDeliveryPopupOpen(false);
          setDeliveryNoticeAcked(true);
        }}
        message={deliveryCheck?.message ?? 'Delivery is unavailable in your area.'}
        expansionMessage={deliveryCheck?.expansionMessage}
        actionLabel="Continue with Pickup"
      />

      <AddressFormDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSubmit={saveAddress}
        initialValues={editingAddress}
        defaultContactName={
          profile?.name && !isGenericCustomerName(profile.name) ? profile.name : undefined
        }
        defaultMobile={profile?.phone ?? undefined}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Your Order</DialogTitle>
            <DialogDescription>Review details before placing your order</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-[#FFF8E8] p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                {pickupOnly ? 'Pickup' : 'Delivery'}
              </p>
              <p>
                {selectedAddress
                  ? `${selectedAddress.line1}, ${selectedAddress.city}`
                  : session.guestAddressDraft?.line1 || '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pickupOnly
                  ? 'Pickup at restaurant — home delivery is not available'
                  : session.deliveryTiming === 'now'
                    ? 'Deliver Now (~30 min)'
                    : `Scheduled: ${session.scheduledDate} ${session.scheduledSlot}`}
              </p>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium">
                {PAYMENT_METHOD_LABELS[session.paymentMethod] || session.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-[#14532D]">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-xl"
            >
              Edit
            </Button>
            <Button
              onClick={placeOrder}
              disabled={placing}
              className="flex-1 rounded-xl bg-[#14532D]"
            >
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={green ? 'text-emerald-600 font-medium' : ''}>{value}</span>
    </div>
  );
}

function GuestAddressForm({
  draft,
  onChange,
  profileName,
  profilePhone,
}: {
  draft: Partial<AddressDto> | null;
  onChange: (d: Partial<AddressDto>) => void;
  profileName?: string | null;
  profilePhone?: string | null;
}) {
  const d = draft ?? {};
  const [locating, setLocating] = useState(false);
  const set = (key: keyof AddressDto, val: string | number) => onChange({ ...d, [key]: val });

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
        });
      });
      const { latitude, longitude } = position.coords;
      onChange({ ...d, latitude, longitude });
    } catch {
      // The customer can continue with a manually entered address.
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="w-full rounded-xl border border-[#14532D] bg-[#F0FDF4] px-3 py-2 text-sm font-semibold text-[#14532D]"
        onClick={() => void useCurrentLocation()}
        disabled={locating}
      >
        <MapPin className="inline h-4 w-4 mr-1" />
        {locating ? 'Finding your location…' : 'Use My Current Location'}
      </button>
      {d.latitude != null && d.longitude != null ? (
        <>
          <LocationPickerMap
            latitude={d.latitude}
            longitude={d.longitude}
            onChange={(latitude, longitude) => onChange({ ...d, latitude, longitude })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Delivery latitude"
              className="rounded-xl border px-3 py-2 text-xs"
              value={d.latitude}
              onChange={(e) => set('latitude', Number(e.target.value))}
            />
            <input
              aria-label="Delivery longitude"
              className="rounded-xl border px-3 py-2 text-xs"
              value={d.longitude}
              onChange={(e) => set('longitude', Number(e.target.value))}
            />
          </div>
        </>
      ) : null}
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        placeholder="Your name *"
        value={d.contactName ?? profileName ?? ''}
        onChange={(e) => set('contactName', e.target.value)}
      />
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        placeholder="Mobile *"
        value={d.mobileNumber ?? profilePhone ?? ''}
        onChange={(e) => set('mobileNumber', e.target.value)}
      />
      <textarea
        className="w-full rounded-xl border px-3 py-2 text-sm"
        placeholder="Full address *"
        rows={2}
        value={d.line1 ?? ''}
        onChange={(e) => set('line1', e.target.value)}
      />
      <input
        className="w-full rounded-xl border px-3 py-2 text-sm"
        placeholder="Landmark"
        value={d.landmark ?? ''}
        onChange={(e) => set('landmark', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="City *"
          value={d.city ?? 'Tura'}
          onChange={(e) => set('city', e.target.value)}
        />
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="Pincode *"
          inputMode="numeric"
          maxLength={6}
          value={d.pincode ?? ''}
          onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
      </div>
    </div>
  );
}
