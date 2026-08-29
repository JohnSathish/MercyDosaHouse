import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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
import { formatCurrency, getScheduleDateOptions, firstPreOrderDate } from '@mdh/utils';
import { api } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth-storage';
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
  code: string;
  type: string;
  value: number;
  discount: number;
  minOrderAmount?: number;
};

export default function CheckoutScreen() {
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
  const scheduleOptions = getScheduleDateOptions(7, new Date(), {
    minDaysAhead: config.delivery.preOrderMinDaysAhead,
  });

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
    queryKey: ['coupons-available', pricing.subtotal],
    queryFn: () => api.get<AvailableCoupon[]>(`/coupons/available?subtotal=${pricing.subtotal}`),
    enabled: couponsEnabled && !pricing.couponsBlocked && pricing.subtotal > 0,
  });

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

  // Same as website: clear coupon when pre-order blocks stacking
  useEffect(() => {
    if (pricing.couponsBlocked && session.couponCode) {
      session.setCouponCode(null);
      setCouponDiscount(0);
      setCouponInput('');
    }
  }, [pricing.couponsBlocked, session.couponCode]);

  // Same as website: auto-apply the best available coupon
  useEffect(() => {
    if (pricing.couponsBlocked || !couponsEnabled) return;
    if (!availableCoupons.length) return;

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

    const best = availableCoupons[0];
    session.setCouponCode(best.code);
    setCouponDiscount(best.discount);
    setCouponInput(best.code);
    setCouponError(null);
  }, [availableCoupons, pricing.couponsBlocked, couponsEnabled]);

  async function applyCoupon(code?: string) {
    const raw = (code ?? couponInput).trim().toUpperCase();
    if (!raw) return;
    if (pricing.couponsBlocked) {
      setCouponError('Pre-order discount cannot be combined with coupon codes.');
      return;
    }
    setCouponError(null);
    try {
      const res = await api.post<{ discount: number; coupon?: { code: string } }>(
        '/coupons/validate',
        {
          code: raw,
          subtotal: pricing.subtotal,
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

    setPlacing(true);
    setError(null);

    try {
      const user = await getStoredUser();
      let payload: Record<string, unknown>;
      const couponCode = pricing.couponsBlocked ? undefined : (session.couponCode ?? undefined);

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

        {authed && profile && (
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyName}>{profile.name ?? profile.phone}</Text>
            <Text style={styles.loyaltyMeta}>
              {profile.loyaltyTier} · {profile.loyaltyPoints} reward pts
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
        {scheduleEnabled ? (
          <Section title="2. Delivery Time">
            <View style={styles.row}>
              {(['now', 'scheduled'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, session.deliveryTiming === t && styles.chipActive]}
                  onPress={() => {
                    session.setDeliveryTiming(t);
                    if (t === 'scheduled' && !session.scheduledDate) {
                      session.setScheduledDate(firstPreOrderDate(scheduleOptions));
                      session.setScheduledSlot(DELIVERY_TIME_SLOTS[0]);
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
                      {d.qualifiesForPreOrder ? <Text style={styles.preBadge}>10% OFF</Text> : null}
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.rowWrap}>
                  {DELIVERY_TIME_SLOTS.map((slot) => (
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

        {/* Coupon — parity with website */}
        {couponsEnabled && !pricing.couponsBlocked ? (
          <Section title="Coupons & Offers">
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
                        {c.code}
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
                No auto offers for this cart — enter a code if you have one.
              </Text>
            )}
            <View style={styles.couponRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter coupon code"
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
        ) : pricing.couponsBlocked ? (
          <Text style={styles.note}>Coupons cannot be combined with pre-order discount.</Text>
        ) : null}

        {/* Loyalty */}
        {loyaltyEnabled && authed && profile && profile.loyaltyPoints > 0 ? (
          <Section title="⭐ Reward Points">
            <Text style={styles.note}>Use up to {profile.loyaltyPoints} points (1 pt = ₹1)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Points to use"
              value={session.rewardPointsToUse ? String(session.rewardPointsToUse) : ''}
              onChangeText={(v) =>
                session.setRewardPointsToUse(
                  Math.min(profile.loyaltyPoints, Math.max(0, Number(v.replace(/\D/g, '')) || 0)),
                )
              }
            />
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
            <Text>{formatCurrency(pricing.subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text>Delivery</Text>
            <Text style={pricing.deliveryIsFree ? styles.discount : undefined}>
              {pricing.deliveryIsFree ? 'Free Delivery' : formatCurrency(pricing.delivery)}
            </Text>
          </View>
          <View style={styles.line}>
            <Text>
              Packing
              {items.length ? ` (${items.reduce((n, i) => n + i.quantity, 0)} Items)` : ''}
            </Text>
            <Text>{formatCurrency(pricing.packingTotal)}</Text>
          </View>
          {pricing.preOrderDiscount > 0 ? (
            <View style={styles.line}>
              <Text style={styles.discount}>Pre-order discount</Text>
              <Text style={styles.discount}>−{formatCurrency(pricing.preOrderDiscount)}</Text>
            </View>
          ) : null}
          {pricing.couponDiscount > 0 ? (
            <View style={styles.line}>
              <Text style={styles.discount}>
                Coupon{session.couponCode ? ` (${session.couponCode})` : ''}
              </Text>
              <Text style={styles.discount}>−{formatCurrency(pricing.couponDiscount)}</Text>
            </View>
          ) : null}
          {pricing.rewardDiscount > 0 ? (
            <View style={styles.line}>
              <Text style={styles.discount}>Reward points</Text>
              <Text style={styles.discount}>−{formatCurrency(pricing.rewardDiscount)}</Text>
            </View>
          ) : null}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(pricing.grandTotal)}</Text>
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
                ? `Review & Place Order · ${formatCurrency(pricing.grandTotal)}`
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
  chipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  preBadge: { fontSize: 9, color: '#F59E0B', fontWeight: '700', marginTop: 2 },
  slotScroll: { marginBottom: 8 },
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
