import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderDto } from '@mdh/types';
import { formatCurrency, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@mdh/utils';
import { api } from '@/lib/api';
import { loadTrackToken } from '@/lib/auth-storage';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { COLORS, RADIUS, SHADOW } from '@/ui/theme';

function BillRow({
  label,
  value,
  muted,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, muted && styles.muted, bold && styles.bold]}>{label}</Text>
      <Text
        style={[
          styles.billValue,
          muted && styles.muted,
          bold && styles.bold,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function OrderSuccessScreen() {
  const { order: orderNumber } = useLocalSearchParams<{ order: string }>();
  const colors = useThemeColors();
  const config = useAppConfig();
  const insets = useSafeAreaInsets();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-receipt', orderNumber],
    queryFn: async () => {
      const token = await loadTrackToken(orderNumber!);
      const q = token ? `?trackToken=${encodeURIComponent(token)}` : '';
      return api.get<OrderDto>(`/orders/track/${encodeURIComponent(orderNumber!)}${q}`);
    },
    enabled: !!orderNumber,
    retry: 1,
  });

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.title, { color: colors.primary }]}>Order Placed!</Text>
        <Text style={styles.subtitle}>Thank you for ordering from {config.branding.appName}.</Text>

        {orderNumber ? (
          <View style={styles.orderBox}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={[styles.orderNumber, { color: colors.primary }]}>{orderNumber}</Text>
            {order?.createdAt ? (
              <Text style={styles.orderMeta}>
                {new Date(order.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : order ? (
          <View style={styles.receipt}>
            <Text style={[styles.receiptTitle, { color: colors.primary }]}>Order Receipt</Text>

            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {item.productName}
                    {item.variantName ? ` (${item.variantName})` : ''}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <BillRow label="Subtotal" value={formatCurrency(order.subtotal)} muted />
            <BillRow
              label="Delivery"
              value={order.deliveryCharge > 0 ? formatCurrency(order.deliveryCharge) : 'Free'}
              muted
              valueColor={order.deliveryCharge === 0 ? COLORS.success : undefined}
            />
            <BillRow label="Packing" value={formatCurrency(order.packingCharge)} muted />
            {(order.discountAmount ?? 0) > 0 ? (
              <BillRow
                label={order.discountName ?? 'Discount'}
                value={`-${formatCurrency(order.discountAmount ?? 0)}`}
                muted
                valueColor={COLORS.success}
              />
            ) : null}

            <View style={styles.divider} />

            <BillRow
              label="Total Paid"
              value={formatCurrency(order.grandTotal)}
              bold
              valueColor={colors.primary}
            />

            <View style={styles.metaBlock}>
              <Text style={styles.metaLine}>
                Payment:{' '}
                <Text style={styles.metaStrong}>
                  {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                </Text>
              </Text>
              <Text style={styles.metaLine}>
                Status:{' '}
                <Text style={styles.metaStrong}>
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </Text>
              </Text>
              {order.deliveryAddress ? (
                <Text style={styles.metaLine}>📍 {order.deliveryAddress}</Text>
              ) : null}
            </View>
          </View>
        ) : orderNumber ? (
          <Text style={styles.hint}>Receipt will be available on the track screen.</Text>
        ) : null}

        <Text style={styles.hint}>We'll start preparing your dosas right away.</Text>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {orderNumber ? (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace(`/track/${encodeURIComponent(orderNumber)}`)}
          >
            <Text style={styles.btnTextLight}>Track Order</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.btn, styles.btnOutline, { borderColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.btnTextDark, { color: colors.primary }]}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 24, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 12, marginTop: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, marginTop: 8, textAlign: 'center', fontSize: 14 },
  orderBox: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  orderLabel: { color: COLORS.textLight, fontSize: 12, fontWeight: '600' },
  orderNumber: {
    fontFamily: 'monospace',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  orderMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 6 },
  receipt: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginTop: 16,
    padding: 16,
    width: '100%',
  },
  receiptTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  itemName: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  itemMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  itemTotal: { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: { color: COLORS.text, fontSize: 14 },
  billValue: { color: COLORS.text, fontSize: 14 },
  muted: { color: COLORS.textMuted },
  bold: { fontWeight: '800', fontSize: 16 },
  metaBlock: { marginTop: 12, gap: 4 },
  metaLine: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  metaStrong: { color: COLORS.text, fontWeight: '700' },
  hint: { color: COLORS.textMuted, fontSize: 14, marginTop: 16, textAlign: 'center' },
  actions: { paddingHorizontal: 16, gap: 10, backgroundColor: COLORS.background },
  btn: { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { backgroundColor: COLORS.surface, borderWidth: 1.5 },
  btnTextLight: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnTextDark: { fontWeight: '700', fontSize: 16 },
});
