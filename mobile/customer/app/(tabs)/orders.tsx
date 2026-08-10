import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { OrderDto } from '@mdh/types';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';

export default function OrdersScreen() {
  const colors = useThemeColors();
  const addItem = useCartStore((s) => s.addItem);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<OrderDto[]>('/users/me/orders'),
    retry: false,
  });

  function reorder(order: OrderDto) {
    for (const item of order.items) {
      addItem(
        {
          productId: item.productId,
          variantId: item.variantId,
          name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
          price: item.unitPrice,
          packingCharge: item.unitPackingCharge,
        },
        item.quantity,
      );
    }
    router.push('/(tabs)/cart');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>My Orders</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        {error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.muted}>Sign in to view your order history.</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.link}>Login</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !error && !orders.length ? (
          <Text style={styles.muted}>No orders yet. Place your first order!</Text>
        ) : null}
        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.number}>#{order.orderNumber}</Text>
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
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.secondary, borderWidth: 0 }]}
                onPress={() => reorder(order)}
              >
                <Text style={styles.actionTextDark}>Reorder</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  muted: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
  emptyWrap: { alignItems: 'center', marginTop: 32 },
  link: { color: '#14532D', fontWeight: '700', marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { fontWeight: '700', color: '#14532D', fontFamily: 'monospace' },
  date: { color: '#9CA3AF', fontSize: 12 },
  status: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  items: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  total: { fontWeight: '700', marginTop: 6, color: '#1F2937' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionText: { fontWeight: '700', fontSize: 13 },
  actionTextDark: { fontWeight: '700', fontSize: 13, color: '#1F2937' },
});
