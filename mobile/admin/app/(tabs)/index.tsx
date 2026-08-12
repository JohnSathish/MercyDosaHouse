import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import {
  AppHeader,
  Card,
  KpiCard,
  LoadingBlock,
  Money,
  PrimaryButton,
  Screen,
  StatusChip,
} from '@/ui';
import { formatInr, theme, timeAgo } from '@/ui/theme';

const rowsOf = (data: any) =>
  Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.orders ?? []);
const statusTone = (s: string): any =>
  ['DELIVERED', 'COMPLETED', 'READY'].includes(s)
    ? 'success'
    : ['CANCELLED', 'REJECTED'].includes(s)
      ? 'danger'
      : ['PENDING'].includes(s)
        ? 'warn'
        : 'info';

export default function DashboardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<any>('/dashboard/stats'),
    refetchInterval: 20_000,
  });
  const status = useQuery({
    queryKey: ['restaurant-status'],
    queryFn: () => api.get<any>('/settings/restaurant-status'),
  });
  const orders = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => api.get<any>('/orders?limit=12'),
    refetchInterval: 20_000,
  });
  const toggle = useMutation({
    mutationFn: () =>
      api.patch('/settings/restaurant-status', { storeOpen: !status.data?.storeOpen }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-status'] }),
    onError: (e: Error) => Alert.alert('Could not change status', e.message),
  });
  const s = stats.data ?? {};
  const recent = rowsOf(orders.data);
  const popular = rowsOf(s.popularItems ?? s.topProducts);
  const refreshing = stats.isRefetching || orders.isRefetching || status.isRefetching;
  const refresh = () => Promise.all([stats.refetch(), status.refetch(), orders.refetch()]);

  return (
    <Screen>
      <AppHeader title="Mercy Dosa House" subtitle="Live operations dashboard" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Card
          style={{
            ...styles.store,
            borderColor: status.data?.storeOpen ? theme.colors.success : theme.colors.danger,
          }}
        >
          <View style={styles.between}>
            <View>
              <Text style={styles.eyebrow}>RESTAURANT STATUS</Text>
              <Text style={styles.storeTitle}>
                {status.data?.storeOpen ? 'Open for orders' : 'Closed'}
              </Text>
              <Text style={styles.muted}>{status.data?.message || 'Controls online ordering'}</Text>
            </View>
            <StatusChip
              label={status.data?.storeOpen ? 'OPEN' : 'CLOSED'}
              tone={status.data?.storeOpen ? 'success' : 'danger'}
            />
          </View>
          <PrimaryButton
            title="Change Status"
            variant={status.data?.storeOpen ? 'danger' : 'primary'}
            loading={toggle.isPending}
            onPress={() => toggle.mutate()}
            style={{ marginTop: 14 }}
          />
        </Card>

        {stats.isLoading ? (
          <LoadingBlock />
        ) : (
          <View style={styles.grid}>
            <KpiCard label="Orders today" value={s.ordersToday ?? 0} />
            <KpiCard
              label="Revenue today"
              value={formatInr(s.revenueToday)}
              accent={theme.colors.success}
            />
            <KpiCard
              label="Pending"
              value={s.pending ?? s.pendingOrders ?? 0}
              accent={theme.colors.secondary}
            />
            <KpiCard label="Preparing" value={s.preparing ?? 0} />
            <KpiCard label="Ready" value={s.ready ?? 0} accent={theme.colors.success} />
            <KpiCard label="Delivered" value={s.deliveredToday ?? 0} />
            <KpiCard
              label="Cancelled"
              value={s.cancelledOrders ?? s.cancelledToday ?? 0}
              accent={theme.colors.danger}
            />
            <KpiCard
              label="AOV"
              value={formatInr(
                (Number(s.revenueToday) || 0) / Math.max(1, Number(s.ordersToday) || 0),
              )}
            />
            <KpiCard label="Customers" value={s.customersToday ?? 0} />
          </View>
        )}

        <Text style={styles.heading}>Popular items</Text>
        <Card>
          {popular.length ? (
            popular.slice(0, 6).map((item: any, i: number) => (
              <View key={item.id ?? i} style={styles.line}>
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name ?? item.productName}</Text>
                  <Text style={styles.muted}>
                    {item.quantity ?? item.orderCount ?? item.sold ?? 0} sold
                  </Text>
                </View>
                {item.revenue != null ? <Money value={item.revenue} /> : null}
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Popular item data will appear after orders arrive.</Text>
          )}
        </Card>

        <View style={styles.sectionTitle}>
          <Text style={styles.heading}>Recent activity</Text>
          <Text style={styles.link} onPress={() => router.push('/(tabs)/orders')}>
            View all
          </Text>
        </View>
        {orders.isLoading ? (
          <LoadingBlock />
        ) : (
          recent.map((order: any) => (
            <Card
              key={order.id}
              onPress={() => router.push(`/orders/${order.id}` as any)}
              style={styles.order}
            >
              <View style={styles.between}>
                <View>
                  <Text style={styles.name}>#{order.orderNumber ?? order.id?.slice(-6)}</Text>
                  <Text style={styles.muted}>
                    {order.customerName ?? order.customer?.name ?? 'Walk-in'} ·{' '}
                    {timeAgo(order.createdAt)}
                  </Text>
                </View>
                <View style={styles.right}>
                  <StatusChip label={order.status ?? 'NEW'} tone={statusTone(order.status)} />
                  <Money value={order.total ?? order.grandTotal} />
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 32, gap: 12 },
  store: { borderWidth: 2 },
  storeTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: theme.colors.muted, letterSpacing: 1 },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 3 },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heading: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: '800',
  },
  name: { fontWeight: '700', color: theme.colors.text },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: theme.colors.primary, fontWeight: '700' },
  order: { marginBottom: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
});
