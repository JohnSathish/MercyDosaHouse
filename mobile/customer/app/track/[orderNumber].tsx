import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import type { OrderDto } from '@mdh/types';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { SOCKET_URL } from '@/lib/constants';
import { OrderTimeline } from '@/components/order-timeline';
import { SupportLinks } from '@/components/support-links';
import { useThemeColors } from '@/providers/config-context';

export default function TrackOrderScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const colors = useThemeColors();
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get<OrderDto>(`/orders/track/${encodeURIComponent(orderNumber)}`),
    enabled: !!orderNumber,
    retry: 1,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!order?.id) return;
    let socket: Socket | null = null;
    try {
      socket = io(`${SOCKET_URL}/orders`, {
        transports: ['websocket', 'polling'],
        timeout: 10_000,
      });
      socket.emit('subscribe', order.id);
      const onUpdate = (data: { status: string }) => setLiveStatus(data.status);
      socket.on('orderUpdate', onUpdate);
      socket.on('orderStatusChanged', onUpdate);
    } catch {
      /* socket optional */
    }
    return () => {
      socket?.disconnect();
    };
  }, [order?.id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Order not found</Text>
          <Pressable onPress={() => router.replace('/(tabs)/orders')}>
            <Text style={styles.link}>View My Orders</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const status = liveStatus ?? order.status;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.primary }]}>Track Order</Text>
          {liveStatus ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.statusBadgeText}>
                {ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <OrderTimeline status={status} primary={colors.primary} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Details</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.line}>
              <Text style={styles.lineLabel}>
                {item.productName}
                {item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
              </Text>
              <Text>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.grandTotal)}</Text>
          </View>
          <Text style={styles.address}>📍 {order.deliveryAddress}</Text>
        </View>

        <Text style={styles.supportTitle}>Need Help?</Text>
        <SupportLinks />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 32 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  orderNum: { fontFamily: 'monospace', color: '#6B7280', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: { fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardTitle: { fontWeight: '700', color: '#14532D', marginBottom: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lineLabel: { flex: 1, color: '#374151', fontSize: 13 },
  totalLine: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontWeight: '800' },
  totalValue: { fontWeight: '800', color: '#14532D' },
  address: { color: '#6B7280', fontSize: 13, marginTop: 10 },
  supportTitle: { fontWeight: '700', color: '#14532D', marginVertical: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#14532D' },
  link: { color: '#14532D', fontWeight: '600', marginTop: 12 },
});
