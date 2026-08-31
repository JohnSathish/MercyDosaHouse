import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderDto } from '@mdh/types';
import type { FeedbackConfigDto } from '@mdh/types';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';
import { RateOrderSheet } from '@/components/review-sheet';
import { COLORS, RADIUS, SHADOW } from '@/ui/theme';

export default function OrdersScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [rateOrder, setRateOrder] = useState<OrderDto | null>(null);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderDto[]>('/users/me/orders'),
    retry: false,
  });
  const { data: feedbackConfig } = useQuery({
    queryKey: ['settings-feedback'],
    queryFn: () => api.get<FeedbackConfigDto>('/settings/feedback'),
    staleTime: 60_000,
  });

  async function reorder(order: OrderDto) {
    setReorderMsg(null);
    let added = 0;
    const skipped: string[] = [];

    for (const item of order.items) {
      try {
        // Verify product still available
        const product = await api.get<{
          id: string;
          name: string;
          price: number;
          isAvailable?: boolean;
          packingCharge?: number;
        }>(`/products/${item.productId}`);
        if (product.isAvailable === false) {
          skipped.push(item.productName);
          continue;
        }
        addItem(
          {
            productId: item.productId,
            variantId: item.variantId,
            name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
            price: product.price ?? item.unitPrice,
            packingCharge: product.packingCharge ?? item.unitPackingCharge,
          },
          item.quantity,
        );
        added += 1;
      } catch {
        skipped.push(item.productName);
      }
    }

    if (added > 0) {
      if (skipped.length) {
        setReorderMsg(`${skipped.length} item(s) unavailable and were skipped.`);
      }
      router.push('/(tabs)/cart');
    } else {
      setReorderMsg('None of the items from this order are available right now.');
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>My Orders</Text>
      </View>
      {reorderMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{reorderMsg}</Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        {error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.muted}>Sign in to view your order history.</Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/(auth)/login', params: { returnTo: '/(tabs)/orders' } })
              }
            >
              <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !error && !orders.length ? (
          <Text style={styles.muted}>No orders yet. Place your first order!</Text>
        ) : null}
        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.number, { color: colors.primary }]}>#{order.orderNumber}</Text>
              <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.status}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.items}>{order.items.map((i) => i.productName).join(', ')}</Text>
            <Text style={styles.total}>{formatCurrency(order.grandTotal)}</Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { borderColor: colors.primary }]}
                onPress={() => router.push(`/track/${encodeURIComponent(order.orderNumber)}`)}
              >
                <Text style={[styles.actionText, { color: colors.primary }]}>Track</Text>
              </Pressable>
              {order.status === 'DELIVERED' && feedbackConfig?.enabled !== false ? (
                <Pressable
                  style={[styles.actionBtn, { borderColor: colors.primary }]}
                  onPress={() => setRateOrder(order)}
                >
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    {order.reviewId ? 'Edit Review' : 'Rate & Review'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.secondary, borderWidth: 0 }]}
                onPress={() => void reorder(order)}
              >
                <Text style={styles.actionTextDark}>Order Again</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      {rateOrder ? (
        <RateOrderSheet order={rateOrder} visible onClose={() => setRateOrder(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  toast: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: 10,
  },
  toastText: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  content: { padding: 16, paddingTop: 0, paddingBottom: 96 },
  muted: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
  emptyWrap: { alignItems: 'center', marginTop: 32 },
  link: { fontWeight: '700', marginTop: 12 },
  card: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { fontWeight: '700', fontFamily: 'monospace' },
  date: { color: COLORS.textLight, fontSize: 12 },
  status: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  items: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  total: { fontWeight: '700', marginTop: 6, color: COLORS.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionText: { fontWeight: '700', fontSize: 13 },
  actionTextDark: { fontWeight: '700', fontSize: 13, color: COLORS.text },
});
