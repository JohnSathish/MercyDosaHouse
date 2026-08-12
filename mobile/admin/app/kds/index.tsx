import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, PrimaryButton, Screen, StatusChip } from '@/ui';
import { formatTimer, orderAgeMs, theme } from '@/ui/theme';

const ordersOf = (d: any) => (Array.isArray(d) ? d : (d?.orders ?? d?.data ?? d?.items ?? []));
const routes: any = {
  accept: 'accept',
  preparing: 'preparing',
  ready: 'ready',
  complete: 'complete',
};
export default function KdsScreen() {
  const qc = useQueryClient();
  const previous = useRef<string[]>([]);
  const [, tick] = useState(0);
  const query = useQuery({
    queryKey: ['kds'],
    queryFn: async () => {
      try {
        return await api.get<any>('/kitchen/dashboard');
      } catch {
        return api.get<any>('/kitchen/orders');
      }
    },
    refetchInterval: 10_000,
  });
  const orders = ordersOf(query.data);
  useEffect(() => {
    const timer = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const ids = orders.map((o: any) => o.id);
    if (previous.current.length && ids.some((id: string) => !previous.current.includes(id)))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    previous.current = ids;
  }, [orders]);
  const action = useMutation({
    mutationFn: ({ id, action }: any) =>
      api.patch(
        `/kitchen/orders/${id}/${routes[action]}`,
        action === 'preparing' ? { trackingStatus: 'COOKING' } : undefined,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds'] }),
    onError: (e: Error) => Alert.alert('Kitchen action failed', e.message),
  });
  const next = (s: string) =>
    s === 'PENDING'
      ? ['accept', 'Accept']
      : ['ACCEPTED', 'CONFIRMED'].includes(s)
        ? ['preparing', 'Start Preparing']
        : s === 'PREPARING'
          ? ['ready', 'Mark Ready']
          : ['complete', 'Complete'];
  return (
    <Screen>
      <View style={styles.banner}>
        <Text style={styles.title}>Kitchen Queue</Text>
        <Text style={styles.live}>● LIVE · {orders.length} active</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o: any) => o.id}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="Kitchen is clear" message="New orders will appear automatically." />
        }
        renderItem={({ item: o }: any) => {
          const n = next(o.status);
          const age = orderAgeMs(o.createdAt);
          return (
            <Card style={{ ...styles.card, ...(age > 20 * 60_000 ? styles.overdue : {}) }}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.order}>#{o.orderNumber}</Text>
                  <Text style={styles.timer}>{formatTimer(age)}</Text>
                </View>
                <StatusChip label={o.status} tone={age > 20 * 60_000 ? 'danger' : 'info'} />
              </View>
              <View style={styles.items}>
                {(o.items ?? []).map((i: any, k: number) => (
                  <Text key={i.id ?? k} style={styles.item}>
                    {i.quantity ?? 1} × {i.productName ?? i.name ?? i.product?.name}
                  </Text>
                ))}
              </View>
              <PrimaryButton
                title={n[1]}
                onPress={() => action.mutate({ id: o.id, action: n[0] })}
                loading={action.isPending && action.variables?.id === o.id}
              />
            </Card>
          );
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#111827',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  live: { color: '#4ADE80', fontWeight: '800', fontSize: 12 },
  list: { padding: 12, gap: 12 },
  card: { borderLeftWidth: 5, borderLeftColor: theme.colors.secondary },
  overdue: { borderLeftColor: theme.colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  order: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  timer: { color: theme.colors.danger, fontWeight: '800', marginTop: 3 },
  items: { paddingVertical: 12, gap: 5 },
  item: { fontWeight: '700', color: theme.colors.text },
});
