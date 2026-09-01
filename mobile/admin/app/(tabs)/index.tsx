import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { WEBSITE_URL } from '@/lib/constants';
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

const statusTone = (s: string): 'success' | 'warn' | 'danger' | 'info' | 'neutral' =>
  ['DELIVERED', 'COMPLETED', 'READY'].includes(s)
    ? 'success'
    : ['CANCELLED', 'REJECTED'].includes(s)
      ? 'danger'
      : ['PENDING'].includes(s)
        ? 'warn'
        : 'info';

const statusLabel = (s?: string) => {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    OUT_FOR_DELIVERY: 'Out',
    DELIVERED: 'Completed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[s ?? ''] ?? s ?? 'New';
};

function resolveImage(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = WEBSITE_URL.replace(/\/$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function orderTypeMeta(order: any): { label: string; tone: 'info' | 'success' | 'neutral' } {
  const raw = String(
    order.orderType ?? order.fulfillmentType ?? order.deliveryType ?? order.type ?? '',
  ).toUpperCase();
  if (raw.includes('DINE')) return { label: 'Dine-in', tone: 'info' };
  if (raw.includes('TAKE') || raw.includes('PICK')) return { label: 'Takeaway', tone: 'neutral' };
  return { label: 'Delivery', tone: 'success' };
}

function SparkBars({ seed = 3 }: { seed?: number }) {
  const heights = [6, 10, 8, 14, 11, 16, 12, 18, 13, 15].map(
    (h, i) => 6 + ((h + seed * (i + 1)) % 14),
  );
  return (
    <View style={styles.sparkRow}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.sparkBar, { height: h }]} />
      ))}
    </View>
  );
}

function formatClock(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

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
  const products = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => api.get<any>('/products?limit=80'),
    staleTime: 60_000,
  });

  const unread = useQuery({
    queryKey: ['admin-inbox-unread'],
    queryFn: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
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
  const productRows = rowsOf(products.data);
  const productByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of productRows) {
      if (p?.name) map.set(String(p.name).toLowerCase(), p);
    }
    return map;
  }, [productRows]);

  const popular = rowsOf(s.popularItems ?? s.topProducts).map((item: any, i: number) => {
    const match = productByName.get(String(item.name ?? item.productName ?? '').toLowerCase());
    return {
      ...item,
      id: item.id ?? match?.id ?? `pop-${i}`,
      name: item.name ?? item.productName,
      count: item.count ?? item.quantity ?? item.orderCount ?? item.sold ?? 0,
      revenue:
        item.revenue ??
        (match?.price != null
          ? Number(match.price) * Number(item.count ?? item.quantity ?? 0)
          : undefined),
      imageUrl: item.imageUrl ?? match?.imageUrl,
    };
  });

  const ordersToday = Number(s.ordersToday ?? 0);
  const revenueToday = Number(s.revenueToday ?? 0);
  const pending = Number(s.pending ?? s.pendingOrders ?? 0);
  const preparing = Number(s.preparing ?? s.preparingOrders ?? 0);
  const ready = Number(s.ready ?? s.readyOrders ?? 0);
  const delivered = Number(s.deliveredToday ?? 0);
  const cancelled = Number(s.cancelledOrders ?? s.cancelledToday ?? 0);
  const customers = Number(s.customersToday ?? 0);
  const aov = revenueToday / Math.max(1, ordersToday);
  const open = status.data?.storeOpen !== false;
  const pendingAttention = pending > 0 ? 'Needs attention' : 'All clear';

  const refreshing = stats.isRefetching || orders.isRefetching || status.isRefetching;
  const refresh = () =>
    Promise.all([stats.refetch(), status.refetch(), orders.refetch(), products.refetch()]);

  return (
    <Screen>
      <AppHeader
        title="Mercy Dosa House"
        subtitle="Live Operations Dashboard"
        showBrandMark
        statusLine={open ? 'All systems running smoothly' : 'Restaurant is currently closed'}
        onMenuPress={() => router.push('/(tabs)/more')}
        notificationCount={unread.data?.unreadCount ?? 0}
        onNotificationsPress={() => router.push('/notifications')}
        periodLabel="Today"
        onPeriodPress={() => router.push('/reports')}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.topRow}>
          <Card
            style={{
              ...styles.storeCard,
              borderColor: open ? theme.colors.success : theme.colors.danger,
            }}
          >
            <Text style={styles.eyebrow}>RESTAURANT STATUS</Text>
            <View style={styles.storeTitleRow}>
              <Text
                style={[
                  styles.storeTitle,
                  { color: open ? theme.colors.primary : theme.colors.danger },
                ]}
              >
                {open ? 'Open for orders' : 'Closed'}
              </Text>
              <StatusChip label={open ? 'OPEN' : 'CLOSED'} tone={open ? 'success' : 'danger'} />
            </View>
            <Text style={styles.muted}>
              {open
                ? 'Currently accepting and delivering orders.'
                : status.data?.message || 'Online ordering is paused.'}
            </Text>
            <PrimaryButton
              title="Change Status ▾"
              variant={open ? 'primary' : 'danger'}
              loading={toggle.isPending}
              onPress={() => toggle.mutate()}
              style={{ marginTop: 12 }}
            />
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.between}>
              <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
              <Text style={styles.summaryChip}>Today ▾</Text>
            </View>
            <SparkBars seed={ordersToday + 2} />
            <View style={styles.summaryMetrics}>
              <View>
                <Text style={styles.summaryMetricLabel}>Orders</Text>
                <Text style={styles.summaryMetricValue}>{ordersToday}</Text>
              </View>
              <View>
                <Text style={styles.summaryMetricLabel}>Revenue</Text>
                <Text style={styles.summaryMetricValue}>{formatInr(revenueToday)}</Text>
              </View>
            </View>
          </Card>
        </View>

        {stats.isLoading ? (
          <LoadingBlock />
        ) : stats.isError ? (
          <Card>
            <Text style={styles.heading}>Could not load live stats</Text>
            <Text style={styles.muted}>
              {stats.error instanceof Error
                ? stats.error.message
                : 'Check your connection and pull to refresh.'}
            </Text>
            <PrimaryButton
              title="Retry"
              onPress={() => void stats.refetch()}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : (
          <View style={styles.grid}>
            <KpiCard
              icon="🛍️"
              label="Orders Today"
              value={ordersToday}
              accent={theme.colors.success}
              hint="Live today"
            />
            <KpiCard
              icon="💰"
              label="Revenue Today"
              value={formatInr(revenueToday)}
              accent={theme.colors.primary}
              hint="Gross sales"
            />
            <KpiCard
              icon="⏱️"
              label="Pending"
              value={pending}
              accent={theme.colors.secondary}
              hint={pendingAttention}
            />
            <KpiCard
              icon="👨‍🍳"
              label="Preparing"
              value={preparing}
              accent="#2563EB"
              hint="In kitchen"
            />
            <KpiCard
              icon="🛎️"
              label="Ready"
              value={ready}
              accent="#7C3AED"
              hint="Pickup / delivery"
            />
            <KpiCard
              icon="✅"
              label="Completed"
              value={delivered}
              accent={theme.colors.success}
              hint="Delivered today"
            />
            <KpiCard
              icon="✕"
              label="Cancelled"
              value={cancelled}
              accent={theme.colors.danger}
              hint="Today"
            />
            <KpiCard
              icon="👥"
              label="Customers"
              value={customers}
              accent="#CA8A04"
              hint="New today"
            />
            <KpiCard
              icon="📄"
              label="Avg. Order"
              value={formatInr(aov)}
              accent="#0891B2"
              hint="AOV today"
            />
          </View>
        )}

        <View style={styles.sectionTitle}>
          <Text style={styles.heading}>🔥 Popular Items</Text>
          <Text style={styles.link} onPress={() => router.push('/(tabs)/menu')}>
            View All
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.popularRow}
        >
          {popular.length ? (
            popular.slice(0, 6).map((item: any, i: number) => {
              const uri = resolveImage(item.imageUrl);
              return (
                <Card key={item.id} style={styles.popularCard}>
                  <View style={styles.popularImageWrap}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.popularImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.popularImage, styles.popularFallback]}>
                        <Text style={{ fontSize: 28 }}>🥘</Text>
                      </View>
                    )}
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{i + 1}</Text>
                    </View>
                  </View>
                  <Text style={styles.popularName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.muted, { paddingHorizontal: 10 }]}>{item.count} orders</Text>
                  {item.revenue != null ? (
                    <Text style={styles.popularRevenue}>{formatInr(item.revenue)}</Text>
                  ) : null}
                  <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                    <SparkBars seed={i + 4} />
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={{ minWidth: 220 }}>
              <Text style={styles.muted}>Popular items appear after orders arrive.</Text>
            </Card>
          )}
        </ScrollView>

        <View style={styles.sectionTitle}>
          <Text style={styles.heading}>📋 Recent Orders</Text>
          <Text style={styles.link} onPress={() => router.push('/(tabs)/orders')}>
            View All Orders
          </Text>
        </View>

        {orders.isLoading ? (
          <LoadingBlock />
        ) : recent.length ? (
          recent.map((order: any) => {
            const type = orderTypeMeta(order);
            return (
              <Card
                key={order.id}
                onPress={() => router.push(`/orders/${order.id}` as any)}
                style={styles.orderCard}
              >
                <View style={styles.orderTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.orderIdRow}>
                      <Text style={styles.orderId} numberOfLines={1}>
                        #
                        {(() => {
                          const raw = String(order.orderNumber ?? '');
                          if (!raw) return String(order.id ?? '').slice(-6);
                          const parts = raw.split('-');
                          return parts.length > 1 ? `MDH${parts[parts.length - 1]}` : raw;
                        })()}
                      </Text>
                      <StatusChip label={type.label} tone={type.tone} />
                    </View>
                    <Text style={styles.orderCustomer} numberOfLines={1}>
                      {order.customerName ?? order.customer?.name ?? 'Walk-in'}
                      {order.deliveryAddress || order.tableNumber
                        ? ` · ${order.tableNumber ?? order.deliveryAddress}`
                        : ''}
                    </Text>
                    <Text style={styles.orderMeta}>
                      {[formatClock(order.createdAt), timeAgo(order.createdAt)]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <StatusChip
                      label={statusLabel(order.status)}
                      tone={statusTone(order.status ?? '')}
                    />
                    <View style={styles.orderPriceRow}>
                      <Money value={order.total ?? order.grandTotal} />
                      <Text style={styles.payMethod}>
                        {order.paymentMethod ?? order.payment?.method ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <Text style={styles.muted}>No recent orders yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 14, paddingBottom: 36, gap: 12 },
  topRow: { gap: 10 },
  storeCard: { borderWidth: 1.5 },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  storeTitle: { fontSize: 20, fontWeight: '800', flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.muted,
    letterSpacing: 0.8,
  },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 3 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  summaryCard: { gap: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  summaryChip: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: '#ECFDF5',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  summaryMetrics: { flexDirection: 'row', gap: 24, marginTop: 4 },
  summaryMetricLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  summaryMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 2,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
    marginTop: 4,
  },
  sparkBar: {
    width: 5,
    borderRadius: 2,
    backgroundColor: '#86EFAC',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  link: { color: theme.colors.primary, fontWeight: '700', fontSize: 12.5 },
  popularRow: { gap: 10, paddingRight: 4 },
  popularCard: { width: 168, padding: 0, overflow: 'hidden' },
  popularImageWrap: { position: 'relative' },
  popularImage: { width: '100%', height: 100, backgroundColor: '#FEF3C7' },
  popularFallback: { alignItems: 'center', justifyContent: 'center' },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  popularName: {
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  popularRevenue: {
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  orderCard: { marginBottom: 2 },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  orderId: { fontWeight: '800', color: theme.colors.text, fontSize: 14 },
  orderCustomer: { color: theme.colors.text, fontSize: 12.5, marginTop: 4, fontWeight: '600' },
  orderMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 6, maxWidth: '38%' },
  orderPriceRow: { alignItems: 'flex-end', gap: 1 },
  payMethod: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  chevron: { color: theme.colors.muted, fontSize: 22, fontWeight: '300', marginLeft: 2 },
});
