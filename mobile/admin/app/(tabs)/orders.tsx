import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import {
  AppHeader,
  Card,
  EmptyState,
  LoadingBlock,
  Money,
  PrimaryButton,
  Screen,
  StatusChip,
} from '@/ui';
import { theme, timeAgo } from '@/ui/theme';

const tabs = [
  { label: 'New', status: 'PENDING' },
  { label: 'Preparing', status: 'PREPARING' },
  { label: 'Ready', status: 'READY' },
  { label: 'All', status: '' },
];
const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? []));
const tone = (s: string): any =>
  s === 'READY' || s === 'DELIVERED'
    ? 'success'
    : s === 'PENDING'
      ? 'warn'
      : s === 'CANCELLED'
        ? 'danger'
        : 'info';

export default function OrdersScreen() {
  const [tab, setTab] = useState(tabs[0]);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['orders', tab.status],
    queryFn: () => api.get<any>(`/orders?limit=100${tab.status ? `&status=${tab.status}` : ''}`),
    refetchInterval: 15_000,
  });
  const accept = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/orders/${id}/status`, { status: 'ACCEPTED', trackingStatus: 'ACCEPTED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onError: (e: Error) => Alert.alert('Accept failed', e.message),
  });
  const q = search.trim().toLowerCase();
  const rows = rowsOf(query.data).filter(
    (o: any) =>
      !q ||
      String(o.orderNumber ?? '')
        .toLowerCase()
        .includes(q) ||
      String(o.customerName ?? o.customer?.name ?? '')
        .toLowerCase()
        .includes(q),
  );

  return (
    <Screen>
      <AppHeader title="Orders" subtitle={`${rows.length} shown`} />
      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t.label}
            onPress={() => setTab(t)}
            style={[styles.tab, tab.label === t.label && styles.active]}
          >
            <Text style={[styles.tabText, tab.label === t.label && styles.activeText]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search order or customer"
        placeholderTextColor={theme.colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      {query.isLoading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(o: any) => o.id}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No orders"
              message="Orders matching this filter will appear here."
              onRetry={query.refetch}
            />
          }
          renderItem={({ item: o }: any) => (
            <Card onPress={() => router.push(`/orders/${o.id}` as any)}>
              <View style={styles.between}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>#{o.orderNumber ?? o.id.slice(-6)}</Text>
                  <Text style={styles.customer}>
                    {o.customerName ?? o.customer?.name ?? 'Walk-in'}
                  </Text>
                </View>
                <Money value={o.total ?? o.grandTotal} />
              </View>
              <View style={styles.meta}>
                <StatusChip label={o.status ?? 'PENDING'} tone={tone(o.status)} />
                <Text style={styles.muted}>
                  {o.orderType ?? o.type ?? 'ONLINE'} · {timeAgo(o.createdAt)}
                </Text>
              </View>
              {o.status === 'PENDING' ? (
                <PrimaryButton
                  title="Quick Accept"
                  loading={accept.isPending && accept.variables === o.id}
                  onPress={() => accept.mutate(o.id)}
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 10, gap: 6, backgroundColor: '#fff' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  active: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.muted, fontWeight: '700', fontSize: 12 },
  activeText: { color: '#fff' },
  search: {
    margin: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
  },
  list: { padding: 12, gap: 10, paddingBottom: 30 },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  customer: { color: theme.colors.text, marginTop: 3 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  muted: { color: theme.colors.muted, fontSize: 12 },
});
