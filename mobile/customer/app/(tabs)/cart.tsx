import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/stores/cart-store';
import { useOrderPricing } from '@/hooks/use-order-pricing';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { OrderChargesCard } from '@/components/order-charges-card';
import { WEBSITE_URL } from '@/lib/constants';
import { COLORS, RADIUS, SHADOW, resolveAssetUrl } from '@/ui/theme';

export default function CartScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const pricing = useOrderPricing();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Your Cart</Text>
        {items.length > 0 && config.delivery.preOrderDiscountPct > 0 ? (
          <Text style={styles.preHint}>
            Schedule {config.delivery.preOrderMinDaysAhead}+ days ahead for{' '}
            {config.delivery.preOrderDiscountPct}% off
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!items.length ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.empty}>Your cart is empty</Text>
            <Pressable
              style={[styles.browseBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.push('/(tabs)/menu')}
            >
              <Text style={styles.browseText}>Browse Menu</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <OrderChargesCard deliveryIsFree={pricing.deliveryIsFree} compact />
            {items.map((item) => {
              const img = resolveAssetUrl(item.imageUrl, WEBSITE_URL);
              return (
                <View key={`${item.productId}-${item.variantId}`} style={styles.row}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbFallback]}>
                      <Text>🥘</Text>
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                    {item.notes ? <Text style={styles.notes}>Note: {item.notes}</Text> : null}
                    <View style={styles.qtyRow}>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity - 1, item.variantId)
                        }
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.qty}>{item.quantity}</Text>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateQuantity(item.productId, item.quantity + 1, item.variantId)
                        }
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => removeItem(item.productId, item.variantId)}
                        hitSlop={8}
                      >
                        <Text style={styles.remove}>🗑</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.lineTotal}>{formatCurrency(item.price * item.quantity)}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={[styles.summary, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Subtotal</Text>
            <Text>{formatCurrency(pricing.subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Delivery</Text>
            <Text style={pricing.deliveryIsFree ? styles.freeDelivery : undefined}>
              {pricing.deliveryIsFree ? 'Free' : formatCurrency(pricing.delivery)}
            </Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Packing</Text>
            <Text>{formatCurrency(pricing.packingTotal)}</Text>
          </View>
          {pricing.discount > 0 ? (
            <View style={styles.line}>
              <Text style={styles.lineLabel}>Discount</Text>
              <Text style={styles.discount}>-{formatCurrency(pricing.discount)}</Text>
            </View>
          ) : null}
          {pricing.amountToFreeDelivery > 0 ? (
            <Text style={styles.freeHint}>
              Add {formatCurrency(pricing.amountToFreeDelivery)} more for free delivery
            </Text>
          ) : null}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(pricing.grandTotal)}
            </Text>
          </View>
          <Pressable
            style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/checkout')}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout →</Text>
          </Pressable>
          <Pressable onPress={clear}>
            <Text style={styles.clear}>Clear cart</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  preHint: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 24 },
  emptyWrap: { alignItems: 'center', marginTop: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  empty: { color: COLORS.textMuted, textAlign: 'center' },
  browseBtn: {
    marginTop: 16,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  browseText: { fontWeight: '800', color: COLORS.text },
  row: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 12,
    gap: 10,
  },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.sm },
  thumbFallback: {
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontWeight: '700', color: COLORS.text },
  price: { color: COLORS.textMuted, marginTop: 2, fontSize: 13 },
  notes: { color: COLORS.textLight, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontWeight: '700', fontSize: 16 },
  qty: { fontWeight: '700', minWidth: 20, textAlign: 'center' },
  remove: { fontSize: 14, marginLeft: 4 },
  lineTotal: { fontWeight: '700', color: COLORS.text, marginTop: 4 },
  summary: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    ...SHADOW.float,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lineLabel: { color: COLORS.textMuted },
  freeHint: { color: COLORS.success, fontSize: 12, marginBottom: 6 },
  freeDelivery: { color: COLORS.success, fontWeight: '700' },
  discount: { color: COLORS.success, fontWeight: '700' },
  totalLine: { marginTop: 8, marginBottom: 12 },
  totalLabel: { fontWeight: '800', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 16 },
  checkoutBtn: { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  checkoutText: { fontWeight: '800', color: '#fff', fontSize: 16 },
  clear: { color: COLORS.textLight, textAlign: 'center', marginTop: 10, fontSize: 13 },
});
