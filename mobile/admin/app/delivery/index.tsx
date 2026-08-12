import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, KpiCard, Money, PrimaryButton, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) =>
  Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.orders ?? d?.executives ?? []);
export default function DeliveryScreen() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const dashboard = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<any>('/delivery/dashboard'),
    refetchInterval: 20_000,
  });
  const orders = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: () => api.get<any>('/delivery/orders'),
    refetchInterval: 20_000,
  });
  const executives = useQuery({
    queryKey: ['delivery-executives'],
    queryFn: () => api.get<any>('/delivery/executives'),
  });
  const assign = useMutation({
    mutationFn: ({ orderId, executiveId }: any) =>
      api.patch(`/delivery/orders/${orderId}/assign`, { executiveId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-orders'] });
      qc.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    },
    onError: (e: Error) => Alert.alert('Assignment failed', e.message),
  });
  const d = dashboard.data ?? {};
  return (
    <Screen>
      <FlatList
        data={rowsOf(orders.data)}
        keyExtractor={(o: any) => o.id}
        refreshing={orders.isRefetching}
        onRefresh={() => {
          orders.refetch();
          dashboard.refetch();
        }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.grid}>
              <KpiCard label="Unassigned" value={d.unassigned ?? d.stats?.unassigned ?? 0} />
              <KpiCard
                label="Out for delivery"
                value={d.outForDelivery ?? d.stats?.outForDelivery ?? 0}
              />
              <KpiCard
                label="Delivered today"
                value={d.deliveredToday ?? d.stats?.deliveredToday ?? 0}
              />
            </View>
            <Text style={styles.heading}>Delivery orders</Text>
          </>
        }
        ListEmptyComponent={<EmptyState title="No delivery orders" onRetry={orders.refetch} />}
        renderItem={({ item: o }: any) => (
          <Card>
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>#{o.orderNumber}</Text>
                <Text style={styles.muted}>{o.customerName ?? o.customer?.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <StatusChip
                  label={o.deliveryStatus ?? o.status}
                  tone={o.deliveryExecutiveId ? 'info' : 'warn'}
                />
                <Money value={o.total ?? o.grandTotal} />
              </View>
            </View>
            <ScrollView horizontal contentContainerStyle={styles.people}>
              {rowsOf(executives.data).map((e: any) => (
                <Pressable
                  key={e.id}
                  onPress={() => setSelected((x) => ({ ...x, [o.id]: e.id }))}
                  style={[styles.person, selected[o.id] === e.id && styles.personOn]}
                >
                  <Text style={styles.personText}>{e.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <PrimaryButton
              title={o.deliveryExecutiveId ? 'Reassign' : 'Assign Delivery Partner'}
              disabled={!selected[o.id]}
              loading={assign.isPending && assign.variables?.orderId === o.id}
              onPress={() => assign.mutate({ orderId: o.id, executiveId: selected[o.id] })}
            />
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  heading: { fontSize: 17, fontWeight: '900', color: theme.colors.text, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '900', color: theme.colors.text },
  muted: { color: theme.colors.muted, marginTop: 4 },
  people: { gap: 6, paddingVertical: 10 },
  person: { borderWidth: 1, borderColor: theme.colors.border, padding: 8, borderRadius: 18 },
  personOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  personText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
});
