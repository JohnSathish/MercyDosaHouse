import { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import type { LiveDeliveryLocationDto, OrderDto } from '@mdh/types';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-storage';
import { SOCKET_URL } from '@/lib/constants';
import { OrderTimeline } from '@/components/order-timeline';
import { SupportLinks } from '@/components/support-links';
import { useThemeColors } from '@/providers/config-context';

export default function TrackOrderScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

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
    void getAccessToken().then((token) => setHasSession(Boolean(token)));
  }, []);

  const liveQuery = useQuery({
    queryKey: ['delivery-live-location', order?.id],
    queryFn: () => api.get<LiveDeliveryLocationDto>(`/delivery/orders/${order!.id}/live-location`),
    enabled: hasSession && order?.status === 'OUT_FOR_DELIVERY',
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!order?.id) return;
    let socket: Socket | null = null;
    let cancelled = false;
    void getAccessToken().then((token) => {
      if (cancelled || !token) return;
      socket = io(`${SOCKET_URL}/orders`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10_000,
      });
      socket.emit('subscribe', order.id);
      const onUpdate = (data: { status: string; message?: string }) => {
        setLiveStatus(data.status);
        if (data.message) setLiveMessage(data.message);
        void queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
      };
      socket.on('orderUpdate', onUpdate);
      socket.on('deliveryLocation', () => {
        void queryClient.invalidateQueries({ queryKey: ['delivery-live-location', order.id] });
      });
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [order?.id, orderNumber, queryClient]);

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
        {order.estimatedDeliveryMinutes ? (
          <Text style={styles.eta}>Estimated {order.estimatedDeliveryMinutes} minutes</Text>
        ) : null}

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.statusBadgeText}>
                {ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.message}>
            {liveMessage ?? order.statusMessage ?? 'We are looking after your order.'}
          </Text>
          <Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text>
          <OrderTimeline
            status={status}
            orderType={(order as { orderType?: string }).orderType}
            primary={colors.primary}
          />
        </View>

        {liveQuery.data?.active ? <LiveDeliveryCard data={liveQuery.data} colors={colors} /> : null}

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

function LiveDeliveryCard({
  data,
  colors,
}: {
  data: LiveDeliveryLocationDto;
  colors: { primary: string };
}) {
  const agent =
    data.agent?.latitude != null && data.agent.longitude != null
      ? { latitude: data.agent.latitude, longitude: data.agent.longitude }
      : null;
  const customer =
    data.customer.latitude != null && data.customer.longitude != null
      ? { latitude: data.customer.latitude, longitude: data.customer.longitude }
      : null;
  const region = useMemo(() => {
    const point = agent ?? customer;
    return point
      ? { ...point, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : { latitude: 25.5133, longitude: 90.2036, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  }, [agent?.latitude, agent?.longitude, customer?.latitude, customer?.longitude]);
  const route = useMemo(
    () => (data.routePolyline ? decodePolyline(data.routePolyline) : []),
    [data.routePolyline],
  );

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>🛵 Track My Order</Text>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Live</Text>
      </View>
      <Text style={styles.message}>Your delivery partner is heading to you.</Text>
      <MapView style={styles.map} initialRegion={region} region={region}>
        {agent ? (
          <Marker coordinate={agent} title={data.agent?.name ?? 'Delivery partner'}>
            <Text style={styles.marker}>🛵</Text>
          </Marker>
        ) : null}
        {customer ? (
          <Marker coordinate={customer} title="Your delivery location">
            <Text style={styles.marker}>📍</Text>
          </Marker>
        ) : null}
        {route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
      </MapView>
      <View style={styles.liveMeta}>
        <Text style={styles.name}>
          {data.distanceKm != null ? `${data.distanceKm.toFixed(1)} km away` : 'Route updating'}
          {data.etaMinutes != null ? ` • ETA ${data.etaMinutes} min` : ''}
        </Text>
        <Text style={styles.muted}>
          {data.agent?.name ? `Delivery Partner ${data.agent.name}` : 'Delivery partner'}
        </Text>
        <Text style={styles.muted}>
          Last updated:{' '}
          {data.lastUpdatedAt
            ? new Date(data.lastUpdatedAt).toLocaleTimeString()
            : 'Waiting for GPS'}
        </Text>
        {data.agent?.phone ? (
          <Pressable onPress={() => void Linking.openURL(`tel:${data.agent?.phone}`)}>
            <Text style={styles.link}>Call delivery partner</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
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
  orderNum: { fontFamily: 'monospace', color: '#6B7280', marginBottom: 4 },
  eta: { color: '#14532D', fontWeight: '600', marginBottom: 12 },
  message: { color: '#374151', fontSize: 14, marginBottom: 6, lineHeight: 20 },
  date: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
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
  map: { height: 240, borderRadius: 14, marginTop: 10 },
  marker: { fontSize: 28 },
  liveMeta: { marginTop: 10, gap: 4 },
  name: { fontWeight: '700', color: '#1F2937' },
  muted: { color: '#6B7280', fontSize: 13 },
  supportTitle: { fontWeight: '700', color: '#14532D', marginVertical: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#14532D' },
  link: { color: '#14532D', fontWeight: '600', marginTop: 12 },
});
