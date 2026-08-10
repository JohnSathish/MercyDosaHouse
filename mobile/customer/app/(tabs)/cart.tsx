import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/stores/cart-store';
import { useOrderPricing } from '@/hooks/use-order-pricing';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { OrderChargesCard } from '@/components/order-charges-card';

export default function CartScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clear = useCartStore((s) => s.clear);
  const pricing = useOrderPricing();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Your Cart</Text>
        {items.length > 0 && config.delivery.preOrderDiscountPct > 0 ? (
          <Text style={styles.preHint}>
            📅 Schedule {config.delivery.preOrderMinDaysAhead}+ days ahead for{' '}
            {config.delivery.preOrderDiscountPct}% off
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!items.length ? (
          <Text style={styles.empty}>Your cart is empty. Browse the menu to add items.</Text>
        ) : (
          <>
            <OrderChargesCard deliveryIsFree={pricing.deliveryIsFree} compact />
            {items.map((item) => (
              <View key={`${item.productId}-${item.variantId}`} style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.price}>
                    {formatCurrency(item.price)} × {item.quantity}
                  </Text>
                  {item.notes ? <Text style={styles.notes}>Note: {item.notes}</Text> : null}
                </View>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.productId, item.quantity - 1, item.variantId)
                    }
                  >
                    <Text>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.productId, item.quantity + 1, item.variantId)
                    }
                  >
                    <Text>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.summary}>
          <View style={styles.line}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(pricing.subtotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text>Packing</Text>
            <Text>{formatCurrency(pricing.packingTotal)}</Text>
          </View>
          <View style={styles.line}>
            <Text>Delivery</Text>
            <Text style={pricing.deliveryIsFree ? styles.freeDelivery : undefined}>
              {pricing.deliveryIsFree ? 'Free Delivery' : formatCurrency(pricing.delivery)}
            </Text>
          </View>
          {pricing.amountToFreeDelivery > 0 ? (
            <Text style={styles.freeHint}>
              Add {formatCurrency(pricing.amountToFreeDelivery)} more for free delivery
            </Text>
          ) : null}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(pricing.grandTotal)}</Text>
          </View>
          <Pressable
            style={[styles.checkoutBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/checkout')}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </Pressable>
          <Pressable onPress={clear}>
            <Text style={styles.clear}>Clear cart</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  preHint: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  content: { padding: 16, paddingTop: 0 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  info: { flex: 1 },
  name: { fontWeight: '600', color: '#1F2937' },
  price: { color: '#6B7280', marginTop: 2, fontSize: 13 },
  notes: { color: '#9CA3AF', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontWeight: '700', minWidth: 20, textAlign: 'center' },
  summary: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  freeHint: { color: '#059669', fontSize: 12, marginBottom: 6 },
  freeDelivery: { color: '#059669', fontWeight: '700' },
  totalLine: { marginTop: 8, marginBottom: 12 },
  totalLabel: { fontWeight: '800', fontSize: 16 },
  totalValue: { fontWeight: '800', fontSize: 16, color: '#14532D' },
  checkoutBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  checkoutText: { fontWeight: '700', color: '#1F2937', fontSize: 16 },
  clear: { color: '#9CA3AF', textAlign: 'center', marginTop: 10, fontSize: 13 },
});
