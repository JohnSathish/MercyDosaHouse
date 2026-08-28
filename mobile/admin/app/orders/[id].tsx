import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { api } from '@/lib/api';
import { markOrderAlertRead } from '@/lib/notification-prefs';
import { Card, EmptyState, LoadingBlock, Money, PrimaryButton, Screen, StatusChip } from '@/ui';
import { formatInr, theme, timeAgo } from '@/ui/theme';
import { useDeliveryLocationSharing } from '@/hooks/use-delivery-location';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!id) return;
    void markOrderAlertRead(String(id));
    void api.post('/notifications/read-by-order', { orderId: String(id) }).catch(() => undefined);
  }, [id]);
  const query = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<any>(`/orders/${id}`),
    enabled: !!id,
  });
  const deliveryQuery = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => api.get<any>(`/delivery/orders/${id}`),
    enabled: !!id,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['order', id] });
    qc.invalidateQueries({ queryKey: ['delivery-order', id] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };
  const action = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      status === 'CANCELLED'
        ? api.patch(`/orders/${id}/reject`, { reason: reason.trim() || 'Cancelled by admin' })
        : status === 'OUT_FOR_DELIVERY'
          ? api.post(`/delivery/orders/${id}/start`)
          : api.patch(`/orders/${id}/status`, {
              status,
              trackingStatus: status === 'PREPARING' ? 'COOKING' : status,
            }),
    onSuccess: refresh,
    onError: (e: Error) => Alert.alert('Action failed', e.message),
  });
  const resend = useMutation({
    mutationFn: () => api.post(`/orders/${id}/resend-order-email`),
    onSuccess: () => Alert.alert('Email sent', 'Order email was queued successfully.'),
    onError: (e: Error) => Alert.alert('Email failed', e.message),
  });
  useDeliveryLocationSharing(
    id,
    deliveryQuery.data?.status === 'OUT_FOR_DELIVERY' &&
      deliveryQuery.data?.assignment?.status === 'OUT_FOR_DELIVERY' &&
      deliveryQuery.data?.assignment?.locationSharingActive === true,
    {
      intervalSeconds: deliveryQuery.data?.deliveryConfig?.locationUpdateIntervalSeconds,
      distanceMeters: deliveryQuery.data?.deliveryConfig?.locationMinDistanceMeters,
    },
  );
  if (query.isLoading)
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  if (!query.data)
    return (
      <Screen>
        <EmptyState title="Order not found" onRetry={query.refetch} />
      </Screen>
    );
  const o = query.data;
  const items = o.items ?? o.orderItems ?? [];
  const address = o.deliveryAddress ?? o.address ?? o.customer?.addresses?.[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.top}>
          <View>
            <Text style={styles.orderNo}>#{o.orderNumber ?? id}</Text>
            <Text style={styles.muted}>
              {timeAgo(o.createdAt)} · {o.orderType ?? 'ONLINE'}
            </Text>
          </View>
          <StatusChip
            label={o.status}
            tone={
              o.status === 'CANCELLED' ? 'danger' : o.status === 'DELIVERED' ? 'success' : 'info'
            }
          />
        </View>
        <Card>
          <Text style={styles.heading}>Items</Text>
          {items.map((item: any, i: number) => (
            <View key={item.id ?? i} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.quantity ?? 1} × {item.productName ?? item.name ?? item.product?.name}
                </Text>
                {item.specialInstructions ? (
                  <Text style={styles.note}>{item.specialInstructions}</Text>
                ) : null}
              </View>
              <Money
                value={
                  item.total ?? Number(item.price ?? item.unitPrice) * Number(item.quantity ?? 1)
                }
              />
            </View>
          ))}
        </Card>
        <Card>
          <Text style={styles.heading}>Customer & delivery</Text>
          <Text style={styles.name}>{o.customerName ?? o.customer?.name ?? 'Guest'}</Text>
          <Text style={styles.muted}>{o.customerPhone ?? o.customer?.phone ?? ''}</Text>
          {address ? (
            <Text style={styles.address}>
              {typeof address === 'string'
                ? address
                : [address.line1, address.line2, address.city, address.pincode]
                    .filter(Boolean)
                    .join(', ')}
            </Text>
          ) : null}
          {o.notes || o.specialInstructions ? (
            <Text style={styles.note}>Note: {o.notes ?? o.specialInstructions}</Text>
          ) : null}
        </Card>
        {deliveryQuery.data?.deliveryLatitude != null &&
        deliveryQuery.data?.deliveryLongitude != null ? (
          <DeliveryMapCard order={deliveryQuery.data} />
        ) : null}
        <Card>
          <Text style={styles.heading}>Payment summary</Text>
          <Line label="Subtotal" value={o.subtotal} />
          <Line label="Discount" value={-(o.discountAmount ?? o.discount ?? 0)} />
          <Line label="Packing" value={o.packingCharge ?? o.packingFee} />
          <Line label="Delivery" value={o.deliveryCharge ?? o.deliveryFee} />
          <Line label="Total" value={o.total ?? o.grandTotal} strong />
          <Text style={styles.muted}>
            {o.paymentMethod ?? 'Payment'} · {o.paymentStatus ?? 'PENDING'}
          </Text>
        </Card>
        <Card>
          <Text style={styles.heading}>Update order</Text>
          <View style={styles.actions}>
            {[
              { s: 'ACCEPTED', title: 'Confirm Order' },
              { s: 'PREPARING', title: 'Start Cooking' },
              { s: 'READY', title: 'Mark Ready' },
              { s: 'OUT_FOR_DELIVERY', title: '🛵 Start Delivery' },
              { s: 'DELIVERED', title: 'Mark Delivered' },
            ].map(({ s, title }) => (
              <PrimaryButton
                key={s}
                title={title}
                onPress={() => action.mutate({ status: s })}
                loading={action.isPending && action.variables?.status === s}
                style={styles.action}
              />
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Cancellation reason"
            value={reason}
            onChangeText={setReason}
            placeholderTextColor={theme.colors.muted}
          />
          <PrimaryButton
            title="Cancel Order"
            variant="danger"
            onPress={() =>
              Alert.alert('Cancel order?', 'This action updates the customer order.', [
                { text: 'Keep' },
                {
                  text: 'Cancel order',
                  style: 'destructive',
                  onPress: () => action.mutate({ status: 'CANCELLED' }),
                },
              ])
            }
            loading={action.isPending && action.variables?.status === 'CANCELLED'}
          />
        </Card>
        <PrimaryButton
          title="Resend Order Email"
          variant="secondary"
          onPress={() => resend.mutate()}
          loading={resend.isPending}
        />
        <PrimaryButton title="Back to Orders" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

function DeliveryMapCard({ order }: { order: any }) {
  const destination = {
    latitude: Number(order.deliveryLatitude),
    longitude: Number(order.deliveryLongitude),
  };
  const agent =
    order.assignment?.latitude != null && order.assignment?.longitude != null
      ? {
          latitude: Number(order.assignment.latitude),
          longitude: Number(order.assignment.longitude),
        }
      : null;
  const region = agent ?? destination;
  return (
    <Card>
      <Text style={styles.heading}>Live delivery map</Text>
      <MapView
        style={styles.deliveryMap}
        initialRegion={{ ...region, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      >
        <Marker coordinate={destination} title="Customer">
          <Text style={styles.mapMarker}>📍</Text>
        </Marker>
        {agent ? (
          <Marker coordinate={agent} title="Delivery agent">
            <Text style={styles.mapMarker}>🛵</Text>
          </Marker>
        ) : null}
      </MapView>
      <Text style={styles.muted}>
        {order.assignment?.distanceKm != null
          ? `${Number(order.assignment.distanceKm).toFixed(1)} km`
          : 'Route estimate unavailable'}
        {order.assignment?.etaMinutes != null ? ` • ETA ${order.assignment.etaMinutes} min` : ''}
      </Text>
      <View style={styles.mapActions}>
        {order.customerPhone ? (
          <PrimaryButton
            title="Call customer"
            variant="ghost"
            onPress={() => void Linking.openURL(`tel:${order.customerPhone}`)}
          />
        ) : null}
        {order.customerPhone ? (
          <PrimaryButton
            title="WhatsApp"
            variant="ghost"
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/91${String(order.customerPhone).replace(/\D/g, '').slice(-10)}`,
              )
            }
          />
        ) : null}
        <PrimaryButton
          title="Navigate"
          variant="secondary"
          onPress={() =>
            void Linking.openURL(
              `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
            )
          }
        />
      </View>
    </Card>
  );
}

function Line({ label, value, strong }: any) {
  if (value == null) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.muted, strong && styles.name]}>{label}</Text>
      <Text style={strong && styles.total}>{formatInr(value)}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNo: { fontSize: 24, fontWeight: '900', color: theme.colors.text },
  muted: { color: theme.colors.muted, fontSize: 13 },
  heading: { color: theme.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  name: { fontWeight: '700', color: theme.colors.text },
  note: { color: '#92400E', marginTop: 5, fontSize: 12 },
  address: { color: theme.colors.text, marginTop: 10, lineHeight: 20 },
  total: { fontWeight: '900', color: theme.colors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, minWidth: '45%' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    color: theme.colors.text,
  },
  deliveryMap: { height: 230, borderRadius: 14, marginBottom: 8 },
  mapMarker: { fontSize: 28 },
  mapActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
