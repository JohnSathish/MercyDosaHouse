import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { PaymentMethod } from '@mdh/types';
import type { AddressDto, CheckoutProfileDto, OrderDto } from '@mdh/types';
import { buildOsmMapHtml } from '@mdh/mobile-shared';
import { STORE_CLOSED_ORDER_MESSAGE } from '@/lib/mobile-messages';
import { DELIVERY_TIME_SLOTS, PAYMENT_OPTIONS } from '@mdh/types';
import {
  CHICKEN_BIRYANI_TIME_SLOT,
  CHICKEN_BIRYANI_VALIDATION_MESSAGE,
  formatCurrency,
  getChickenBiryaniScheduleOptions,
  getScheduleDateOptions,
  firstPreOrderDate,
  isChickenBiryaniScheduleMatch,
  isChickenDumBiryaniProduct,
} from '@mdh/utils';
import { api } from '@/lib/api';
import { getStoredUser, isAuthenticated, saveTrackToken } from '@/lib/auth-storage';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutStore } from '@/stores/checkout-store';
import { useOrderPricing } from '@/hooks/use-order-pricing';
import { useAppConfig, useFeatureFlag, useThemeColors } from '@/providers/config-context';
import { ErrorBoundary } from '@/components/error-boundary';

const OSMWebView = WebView as unknown as ComponentType<any>;

function createCheckoutMapHtml(latitude: number, longitude: number): string | null {
  try {
    return buildOsmMapHtml({
      points: [
        {
          id: 'delivery',
          latitude,
          longitude,
          label: 'Delivery location',
          type: 'customer',
        },
      ],
      interactive: true,
    });
  } catch {
    return null;
  }
}

type AvailableCoupon = {
  id: string;
  name: string;
  code: string;
  type: string;
  value: number;
  discount: number;
  minOrderAmount?: number;
};

export default function CheckoutScreen() {
  return (
    <ErrorBoundary>
      <CheckoutScreenBody />
    </ErrorBoundary>
  );
}

function CheckoutScreenBody() {
  const colors = useThemeColors();
  const config = useAppConfig();
  const queryClient = useQueryClient();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const toOrderItems = useCartStore((s) => s.toOrderItems);
  const session = useCheckoutStore();
  // Match website: coupons always offered at checkout (remote flag defaults to on)
  const couponsEnabled = config.featureFlags?.coupons !== false;
  const loyaltyEnabled = useFeatureFlag('loyalty');
  const scheduleEnabled = useFeatureFlag('scheduled_orders');
  const storeOpen = config.store.storeOpen !== false;

  const [authed, setAuthed] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricing = useOrderPricing(couponDiscount);
  const hasChickenBiryani = items.some((item) => isChickenDumBiryaniProduct({ name: item.name }));
  const scheduleOptions = useMemo(
    () =>
      hasChickenBiryani
        ? getChickenBiryaniScheduleOptions(7)
        : getScheduleDateOptions(7, new Date(), {
            minDaysAhead: config.delivery.preOrderMinDaysAhead,
          }),
    [config.delivery.preOrderMinDaysAhead, hasChickenBiryani],
  );
  const scheduleTimeSlots = useMemo(
    () => (hasChickenBiryani ? [CHICKEN_BIRYANI_TIME_SLOT] : DELIVERY_TIME_SLOTS),
    [hasChickenBiryani],
  );

  useEffect(() => {
    if (!hasChickenBiryani) return;
    const firstSunday = firstPreOrderDate(scheduleOptions);
    if (!scheduleOptions.some((date) => date.value === session.scheduledDate)) {
      session.setScheduledDate(firstSunday);
    }
    if (session.scheduledSlot !== CHICKEN_BIRYANI_TIME_SLOT) {
      session.setScheduledSlot(CHICKEN_BIRYANI_TIME_SLOT);
    }
    if (session.deliveryTiming !== 'scheduled') {
      session.setDeliveryTiming('scheduled');
    }
  }, [
    hasChickenBiryani,
    session.deliveryTiming,
    session.scheduledDate,
    session.scheduledSlot,
    scheduleOptions,
  ]);

  useEffect(() => {
    void isAuthenticated().then((ok) => {
      setAuthed(ok);
      if (!ok) {
        router.replace({
          pathname: '/(auth)/login',
          params: { returnTo: '/checkout' },
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!items.length) router.replace('/(tabs)/cart');
  }, [items.length]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['checkout-profile'],
    queryFn: () => api.get<CheckoutProfileDto>('/users/me/checkout-profile'),
    enabled: authed,
  });

  const { data: availableCoupons = [] } = useQuery({
    queryKey: ['coupons-available', pricing.subtotal, items],
    queryFn: () =>
      api.get<AvailableCoupon[]>(
        `/coupons/available?subtotal=${pricing.subtotal}&productIds=${items
          .map((item) => item.productId)
          .join(',')}&items=${encodeURIComponent(
          JSON.stringify(
            items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
          ),
        )}`,
      ),
    enabled: couponsEnabled && pricing.subtotal > 0,
  });

  const quoteItems = items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));
  const discountItems = items.map((item) => ({
    productId: item.productId,
    totalPrice: item.price * item.quantity,
  }));
  const { data: serverQuote } = useQuery({
    queryKey: [
      'order-quote',
      quoteItems,
      session.couponCode,
      pricing.scheduledIso,
      session.rewardPointsToUse,
    ],
    queryFn: () =>
      api.post<{
        grandTotal: number;
        subtotal: number;
        deliveryCharge: number;
        packingCharge: number;
        packedItemCount: number;
        discountAmount: number;
        discountName: string | null;
      }>('/orders/quote', {
        items: quoteItems,
        couponCode: couponsEnabled ? (session.couponCode ?? undefined) : undefined,
        scheduledDeliveryAt: pricing.scheduledIso ?? undefined,
        rewardPointsUsed: loyaltyEnabled ? session.rewardPointsToUse : undefined,
        orderType: 'DELIVERY',
      }),
    enabled: quoteItems.length > 0,
    staleTime: 10_000,
  });

  const displayedSubtotal = serverQuote?.subtotal ?? pricing.subtotal;
  const displayedDelivery = serverQuote?.deliveryCharge ?? pricing.delivery;
  const displayedPacking = serverQuote?.packingCharge ?? pricing.packingTotal;
  const displayedPackedItemCount =
    serverQuote?.packedItemCount ?? items.reduce((n, i) => n + i.quantity, 0);
  const displayedDeliveryIsFree = serverQuote
    ? serverQuote.deliveryCharge === 0
    : pricing.deliveryIsFree;

  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
  const selectedAddress =
    addresses.find((a) => a.id === session.selectedAddressId) ??
    addresses.find((a) => a.isDefault) ??
    addresses[0];

  useEffect(() => {
    if (selectedAddress?.id && !session.selectedAddressId) {
      session.setSelectedAddressId(selectedAddress.id);
    }
  }, [selectedAddress, session.selectedAddressId]);

  // Automatically select the best active admin discount for this cart.
  useEffect(() => {
    if (!couponsEnabled) return;

    if (session.couponCode) {
      const stillValid = availableCoupons.find((c) => c.code === session.couponCode);
      if (stillValid) {
        setCouponDiscount(stillValid.discount);
        setCouponInput(stillValid.code);
        return;
      }
      session.setCouponCode(null);
      setCouponDiscount(0);
    }

    if (!availableCoupons.length) return;
    const best = availableCoupons[0];
    session.setCouponCode(best.code);
    setCouponDiscount(best.discount);
    setCouponInput(best.code);
    setCouponError(null);
  }, [availableCoupons, couponsEnabled]);

  async function applyCoupon(code?: string) {
    const raw = (code ?? couponInput).trim().toUpperCase();
    if (!raw) return;
    setCouponError(null);
    try {
      const res = await api.post<{ discount: number; coupon?: { code: string } }>(
        '/coupons/validate',
        {
          code: raw,
          subtotal: pricing.subtotal,
          items: discountItems,
        },
      );
      const applied = res.coupon?.code ?? raw;
      setCouponDiscount(res.discount);
      setCouponInput(applied);
      session.setCouponCode(applied);
    } catch (e) {
      setCouponDiscount(0);
      session.setCouponCode(null);
      setCouponError(e instanceof Error ? e.message : 'Invalid coupon');
    }
  }

  function clearCoupon() {
    setCouponDiscount(0);
    setCouponInput('');
    session.setCouponCode(null);
    setCouponError(null);
  }

  async function placeOrder() {
    if (!storeOpen) {
      setError(config.store.storeClosedMessage?.trim() || STORE_CLOSED_ORDER_MESSAGE);
      return;
    }
    if (!items.length) return;
    if (
      session.deliveryTiming === 'scheduled' &&
      (!session.scheduledDate || !session.scheduledSlot)
    ) {
      setError('Choose delivery date and time');
      return;
    }
    if (hasChickenBiryani && !isChickenBiryaniScheduleMatch(pricing.scheduledIso)) {
      setError(CHICKEN_BIRYANI_VALIDATION_MESSAGE);
      return;
    }

    setPlacing(true);
    setError(null);

    try {
      const user = await getStoredUser();
      let payload: Record<string, unknown>;
      const couponCode = couponsEnabled ? (session.couponCode ?? undefined) : undefined;

      if (authed && selectedAddress) {
        payload = {
          customerName: selectedAddress.contactName || profile?.name || 'Customer',
          customerPhone: profile?.phone || selectedAddress.mobileNumber,
          addressId: selectedAddress.id,
          paymentMethod: session.paymentMethod,
          couponCode,
          rewardPointsUsed: loyaltyEnabled ? session.rewardPointsToUse : 0,
          scheduledDeliveryAt: pricing.scheduledIso ?? undefined,
          deliveryInstructions: session.deliveryInstructions || selectedAddress.deliveryNotes,
          items: toOrderItems(),
        };
      } else if (session.guestAddressDraft?.line1) {
        const g = session.guestAddressDraft;
        payload = {
          customerName: g.contactName || user?.name || 'Guest',
          customerPhone: g.mobileNumber || user?.phone || '',
          address: g,
          paymentMethod: session.paymentMethod,
          couponCode,
          scheduledDeliveryAt: pricing.scheduledIso ?? undefined,
          items: toOrderItems(),
        };
      } else {
        setError('Add a delivery address first');
        setPlacing(false);
        return;
      }

      const order = await api.post<OrderDto>('/orders', payload);
      if (order.trackToken) await saveTrackToken(order.orderNumber, order.trackToken);
      clearCart();
      session.resetSession();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace(`/order/success?order=${encodeURIComponent(order.orderNumber)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  if (!items.length) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Checkout</Text>

        {config.business.fssaiEnabled !== false && config.business.fssaiRegistrationNumber ? (
          <View style={styles.fssaiCard}>
            <Text style={styles.fssaiTitle}>🛡️ FSSAI Registered Food Business</Text>
            <Text style={styles.fssaiText}>
              Registration No. {config.business.fssaiRegistrationNumber}
            </Text>
            {config.business.fssaiCertificateUrl ? (
              <Pressable onPress={() => void Linking.openURL(config.business.fssaiCertificateUrl!)}>
                <Text style={styles.fssaiLink}>View certificate</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {authed && profile && (
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyName}>{profile.name ?? profile.phone}</Text>
            <Text style={styles.loyaltyMeta}>
              {profile.bronze
                ? `🪙 ${profile.bronze.available} Bronze Coins · ₹${profile.bronze.valueAvailable}`
                : `${profile.loyaltyTier} · ${profile.loyaltyPoints} Bronze Coins`}
            </Text>
          </View>
        )}

        {/* Address */}
        <Section title="1. Delivery Address">
          {authed && profileLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : authed && addresses.length ? (
            addresses.map((addr) => (
              <Pressable
                key={addr.id}
                style={[styles.card, session.selectedAddressId === addr.id && styles.cardSelected]}
                onPress={() => session.setSelectedAddressId(addr.id ?? null)}
              >
                <Text style={styles.cardTitle}>{addr.label ?? addr.addressType ?? 'Address'}</Text>
                <Text style={styles.cardBody}>
                  {addr.line1}, {addr.city} — {addr.pincode}
                </Text>
                <Text style={styles.cardMeta}>
                  {addr.contactName} · {addr.mobileNumber}
                </Text>
              </Pressable>
            ))
          ) : (
            <GuestAddressForm />
          )}
          {authed ? (
            <Pressable onPress={() => router.push('/addresses/new')}>
              <Text style={styles.link}>+ Add new address</Text>
            </Pressable>
          ) : null}
        </Section>

        {/* Schedule */}
        {scheduleEnabled || hasChickenBiryani ? (
          <Section title="2. Delivery Time">
            <View style={styles.row}>
              {(['now', 'scheduled'] as const).map((t) => (
                <Pressable
                  key={t}
                  disabled={hasChickenBiryani && t === 'now'}
                  style={[
                    styles.chip,
                    session.deliveryTiming === t && styles.chipActive,
                    hasChickenBiryani && t === 'now' && styles.chipDisabled,
                  ]}
                  onPress={() => {
                    if (hasChickenBiryani && t === 'now') return;
                    session.setDeliveryTiming(t);
                    if (t === 'scheduled' && !session.scheduledDate) {
                      session.setScheduledDate(firstPreOrderDate(scheduleOptions));
                      session.setScheduledSlot(scheduleTimeSlots[0]);
                    }
                  }}
                >
                  <Text
                    style={[styles.chipText, session.deliveryTiming === t && styles.chipTextActive]}
                  >
                    {t === 'now' ? '⚡ Now' : '📅 Schedule'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {session.deliveryTiming === 'scheduled' ? (
              <>
                {hasChickenBiryani ? (
                  <View style={styles.biryaniNotice}>
                    <Text style={styles.biryaniNoticeTitle}>
                      🍗 Chicken Dum Biryani — Sunday Special
                    </Text>
                    <Text style={styles.biryaniNoticeText}>
                      Available only on Sundays. Freshly prepared and ready for delivery between
                      1:00 PM – 2:00 PM.
                    </Text>
                    <Text style={styles.biryaniNoticeTitle}>📅 Pre-order by Saturday</Text>
                    <Text style={styles.biryaniNoticeText}>
                      Please place your order one day in advance so we can prepare your biryani
                      fresh according to demand.
                    </Text>
                  </View>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.slotScroll}
                >
                  {scheduleOptions.map((d) => (
                    <Pressable
                      key={d.value}
                      style={[styles.chip, session.scheduledDate === d.value && styles.chipActive]}
                      onPress={() => session.setScheduledDate(d.value)}
                    >
                      <Text style={styles.chipText}>{d.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.rowWrap}>
                  {scheduleTimeSlots.map((slot) => (
                    <Pressable
                      key={slot}
                      style={[styles.chip, session.scheduledSlot === slot && styles.chipActive]}
                      onPress={() => session.setScheduledSlot(slot)}
                    >
                      <Text style={styles.chipText}>{slot}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </Section>
        ) : null}

        {/* Payment */}
        <Section title="3. Payment Method">
          {PAYMENT_OPTIONS.filter((p) => {
            const methods = (config.paymentMethods ?? [])
              .filter((m) => m.isEnabled)
              .map((m) => m.method);
            return methods.length === 0 || methods.includes(p.value);
          }).map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.card, session.paymentMethod === opt.value && styles.cardSelected]}
              onPress={() => session.setPaymentMethod(opt.value as PaymentMethod)}
            >
              <Text style={styles.cardTitle}>
                {opt.icon} {opt.label}
              </Text>
            </Pressable>
          ))}
        </Section>

        {/* Admin-controlled discounts */}
        {couponsEnabled ? (
          <Section title="Offers & Discounts">
            {availableCoupons.some((c) => c.appliesTo === 'ANDROID') ? (
              <View style={styles.appExclusive}>
                <Text style={styles.appExclusiveText}>
                  📱 APP EXCLUSIVE
                  {availableCoupons
                    .filter((c) => c.appliesTo === 'ANDROID')
                    .map((c) =>
                      c.type === 'PERCENTAGE' ? ` — ${c.value}% OFF` : ` — ₹${c.value} OFF`,
                    )
                    .join('')}
                </Text>
              </View>
            ) : null}
            {availableCoupons.length ? (
              <View style={styles.availableList}>
                {availableCoupons.map((c) => {
                  const selected = session.couponCode === c.code;
                  return (
                    <Pressable
                      key={c.code}
                      style={[styles.couponChip, selected && styles.couponChipActive]}
                      onPress={() => void applyCoupon(c.code)}
                    >
                      <Text style={[styles.couponChipCode, selected && { color: '#fff' }]}>
                        {c.appliesTo === 'ANDROID' ? '📱 APP EXCLUSIVE — ' : ''}
                        {c.name ?? c.code}
                      </Text>
                      <Text style={[styles.couponChipSave, selected && { color: '#FDE68A' }]}>
                        Save {formatCurrency(c.discount)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.note}>
                No active discounts for this cart — enter a code if you have one.
              </Text>
            )}
            <View style={styles.couponRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter discount code"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
              <Pressable
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                onPress={() => void applyCoupon()}
              >
                <Text style={styles.applyText}>Apply</Text>
              </Pressable>
            </View>
            {couponError ? <Text style={styles.err}>{couponError}</Text> : null}
            {couponDiscount > 0 && session.couponCode ? (
              <View style={styles.appliedRow}>
                <Text style={styles.success}>
                  Coupon {session.couponCode} applied: −{formatCurrency(couponDiscount)}
                </Text>
                <Pressable onPress={clearCoupon}>
                  <Text style={styles.clearCoupon}>Remove</Text>
                </Pressable>
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* Loyalty */}
        {loyaltyEnabled && authed && profile ? (
          <Section title="🪙 Use Bronze Coins">
            <Text style={styles.note}>
              You have {profile.bronze?.available ?? profile.loyaltyPoints} Bronze Coins · Worth ₹
              {profile.bronze?.valueAvailable ?? profile.loyaltyPoints}
            </Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  session.setRewardPointsToUse(Math.max(0, session.rewardPointsToUse - 1))
                }
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{session.rewardPointsToUse}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  session.setRewardPointsToUse(
                    Math.min(
                      profile.bronze?.available ?? profile.loyaltyPoints,
                      session.rewardPointsToUse + 1,
                    ),
                  )
                }
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
            {session.rewardPointsToUse > 0 ? (
              <>
                <Text style={styles.success}>
                  🪙 You save ₹{session.rewardPointsToUse} using Bronze Coins
                </Text>
                <Text style={styles.note}>
                  Remaining after redemption:{' '}
                  {(profile.bronze?.available ?? profile.loyaltyPoints) - session.rewardPointsToUse}{' '}
                  Coins
                </Text>
              </>
            ) : null}
            <Text style={styles.note}>
              You’ll earn 1 Bronze Coin when your order is delivered. 1 Coin = ₹1.
            </Text>
          </Section>
        ) : null}

        {/* Summary */}
        <Section title="4. Order Summary">
          {items.map((i) => (
            <View key={`${i.productId}-${i.variantId}`} style={styles.line}>
              <Text style={{ flex: 1, marginRight: 8 }}>
                {i.name} × {i.quantity}
              </Text>
              <Text>{formatCurrency(i.price * i.quantity)}</Text>
            </View>
          ))}
          <View style={styles.line}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(displayedSubtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text>Delivery</Text>
            <Text style={displayedDeliveryIsFree ? styles.discount : undefined}>
              {displayedDeliveryIsFree ? 'Free Delivery' : formatCurrency(displayedDelivery)}
            </Text>
          </View>
          <View style={styles.line}>
            <Text>
              Packing
              {displayedPackedItemCount
                ? ` (${displayedPackedItemCount} Item${displayedPackedItemCount === 1 ? '' : 's'})`
                : ''}
            </Text>
            <Text>{formatCurrency(displayedPacking)}</Text>
          </View>
          {(serverQuote?.discountAmount ?? 0) > 0 ? (
            <View style={styles.line}>
              <Text style={styles.discount}>{serverQuote?.discountName ?? 'Discount'}</Text>
              <Text style={styles.discount}>
                −{formatCurrency(serverQuote?.discountAmount ?? 0)}
              </Text>
            </View>
          ) : null}
          {pricing.rewardDiscount > 0 ? (
            <View style={styles.line}>
              <Text style={styles.discount}>Bronze Coins Discount</Text>
              <Text style={styles.discount}>−{formatCurrency(pricing.rewardDiscount)}</Text>
            </View>
          ) : null}
          {serverQuote?.discountName && serverQuote.discountAmount > 0 ? (
            <Text style={styles.success}>
              🎉 {serverQuote.discountName} applied — you saved{' '}
              {formatCurrency(serverQuote.discountAmount)}
            </Text>
          ) : null}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(serverQuote?.grandTotal ?? pricing.grandTotal)}
            </Text>
          </View>
        </Section>

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.placeBtn, { backgroundColor: storeOpen ? colors.secondary : '#9CA3AF' }]}
          onPress={placeOrder}
          disabled={placing || !storeOpen}
        >
          {placing ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <Text style={styles.placeText}>
              {storeOpen
                ? `Review & Place Order · ${formatCurrency(serverQuote?.grandTotal ?? pricing.grandTotal)}`
                : 'Restaurant Closed'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function GuestAddressForm() {
  const session = useCheckoutStore();
  const [locating, setLocating] = useState(false);
  const draft = session.guestAddressDraft ?? {
    contactName: '',
    mobileNumber: '',
    line1: '',
    city: 'Shillong',
    pincode: '',
    state: 'Meghalaya',
  };
  const mapHtml =
    typeof draft.latitude === 'number' && typeof draft.longitude === 'number'
      ? createCheckoutMapHtml(draft.latitude, draft.longitude)
      : null;

  function update(patch: Partial<AddressDto>) {
    session.setGuestAddressDraft({ ...draft, ...patch });
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Location permission needed',
          'Allow location access to set an accurate delivery pin.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      const line1 = [place?.name, place?.street].filter(Boolean).join(', ');
      update({
        latitude,
        longitude,
        line1: line1 || `Pinned location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
        city: place?.city || place?.district || draft.city || 'Tura',
        state: place?.region || draft.state || 'Meghalaya',
        pincode: place?.postalCode || draft.pincode || '',
      });
    } catch {
      Alert.alert('Location unavailable', 'Enter the address manually or try again outdoors.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.guestForm}>
      <Pressable
        style={styles.locationButton}
        onPress={() => void useCurrentLocation()}
        disabled={locating}
      >
        <Text style={styles.locationButtonText}>
          {locating ? 'Finding your location…' : '📍 Use My Current Location'}
        </Text>
      </Pressable>
      {mapHtml ? (
        <ErrorBoundary
          fallback={
            <View style={styles.mapFallback}>
              <Text style={styles.note}>
                Map preview is unavailable. Your delivery pin is still saved.
              </Text>
            </View>
          }
        >
          <OSMWebView
            originWhitelist={['*']}
            source={{
              html: mapHtml,
            }}
            javaScriptEnabled
            onMessage={(event: { nativeEvent: { data: string } }) => {
              try {
                const message = JSON.parse(event.nativeEvent.data) as {
                  type?: string;
                  latitude?: number;
                  longitude?: number;
                };
                if (
                  message.type === 'location' &&
                  Number.isFinite(message.latitude) &&
                  Number.isFinite(message.longitude)
                ) {
                  update({ latitude: message.latitude, longitude: message.longitude });
                }
              } catch {
                // Ignore malformed WebView messages.
              }
            }}
            style={styles.checkoutMap}
          />
        </ErrorBoundary>
      ) : draft.latitude != null && draft.longitude != null ? (
        <View style={styles.mapFallback}>
          <Text style={styles.note}>
            Map preview is unavailable. Your delivery pin is still saved.
          </Text>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={draft.contactName ?? ''}
        onChangeText={(v) => update({ contactName: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Mobile (10 digits)"
        keyboardType="phone-pad"
        value={draft.mobileNumber ?? ''}
        onChangeText={(v) => update({ mobileNumber: v })}
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Address line"
        value={draft.line1 ?? ''}
        onChangeText={(v) => update({ line1: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="City"
        value={draft.city ?? ''}
        onChangeText={(v) => update({ city: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Pincode"
        keyboardType="number-pad"
        value={draft.pincode ?? ''}
        onChangeText={(v) => update({ pincode: v })}
        maxLength={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  content: { padding: 16, paddingBottom: 120 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  fssaiCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  fssaiTitle: { color: '#14532D', fontSize: 13, fontWeight: '800' },
  fssaiText: { color: '#166534', fontSize: 12, fontWeight: '600', marginTop: 4 },
  fssaiLink: { color: '#14532D', fontSize: 12, fontWeight: '800', marginTop: 8 },
  loyaltyCard: {
    backgroundColor: '#14532D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  loyaltyName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loyaltyMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontWeight: '700', color: '#14532D', marginBottom: 10, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cardSelected: { borderColor: '#14532D', backgroundColor: '#F0FDF4' },
  cardTitle: { fontWeight: '600', color: '#1F2937' },
  cardBody: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  cardMeta: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  link: { color: '#14532D', fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#14532D', borderColor: '#14532D' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  preBadge: { fontSize: 9, color: '#F59E0B', fontWeight: '700', marginTop: 2 },
  slotScroll: { marginBottom: 8 },
  biryaniNotice: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginBottom: 10,
    padding: 12,
  },
  biryaniNoticeTitle: { color: '#92400E', fontSize: 13, fontWeight: '700' },
  biryaniNoticeText: { color: '#78350F', fontSize: 12, lineHeight: 17 },
  couponRow: { flexDirection: 'row', gap: 8 },
  availableList: { gap: 8, marginBottom: 10 },
  couponChip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponChipActive: { borderColor: '#14532D', backgroundColor: '#14532D' },
  couponChipCode: { fontWeight: '800', color: '#14532D', fontSize: 14 },
  couponChipSave: { color: '#059669', fontWeight: '600', fontSize: 12, marginTop: 2 },
  appExclusive: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  appExclusiveText: { color: '#FDE68A', fontWeight: '800', fontSize: 13 },
  appliedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  clearCoupon: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flex: 1,
  },
  applyBtn: { borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '700' },
  guestForm: { gap: 0 },
  locationButton: {
    borderWidth: 1,
    borderColor: '#14532D',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginBottom: 8,
  },
  locationButtonText: { color: '#14532D', fontWeight: '700' },
  checkoutMap: { height: 190, borderRadius: 12, marginBottom: 8 },
  mapFallback: {
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    marginBottom: 8,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLine: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontWeight: '800', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 16, color: '#14532D' },
  discount: { color: '#059669' },
  note: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  stepValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14532D',
    minWidth: 40,
    textAlign: 'center',
  },
  err: { color: '#DC2626', marginBottom: 8 },
  success: { color: '#059669', fontWeight: '600' },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  placeBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  placeText: { color: '#1F2937', fontWeight: '800', fontSize: 16 },
});
