import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, KpiCard, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) =>
  Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.inventoryItems ?? []);
export default function InventoryScreen() {
  const query = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      try {
        return await api.get<any>('/inventory/dashboard');
      } catch {
        return api.get<any>('/inventory/items?limit=100');
      }
    },
    refetchInterval: 30_000,
  });
  const d = query.data ?? {};
  const rows = rowsOf(d);
  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(x: any) => x.id}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <View style={styles.grid}>
              <KpiCard
                label="Total items"
                value={d.totalItems ?? d.stats?.totalItems ?? rows.length}
              />
              <KpiCard
                label="Low stock"
                value={
                  d.lowStock ??
                  d.stats?.lowStock ??
                  rows.filter(
                    (x: any) =>
                      Number(x.currentStock ?? x.quantity) <=
                      Number(x.reorderLevel ?? x.minimumStock),
                  ).length
                }
                accent={theme.colors.secondary}
              />
              <KpiCard
                label="Out of stock"
                value={d.outOfStock ?? d.stats?.outOfStock ?? 0}
                accent={theme.colors.danger}
              />
            </View>
            <Text style={styles.heading}>Stock levels</Text>
          </>
        }
        ListEmptyComponent={<EmptyState title="No inventory items" onRetry={query.refetch} />}
        renderItem={({ item: x }: any) => {
          const stock = Number(x.currentStock ?? x.quantity ?? x.stock ?? 0);
          const min = Number(x.reorderLevel ?? x.minimumStock ?? 0);
          return (
            <Card>
              <View style={styles.row}>
                <View>
                  <Text style={styles.name}>{x.name}</Text>
                  <Text style={styles.muted}>{x.category?.name ?? x.unit ?? 'Inventory item'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 5 }}>
                  <Text style={styles.stock}>
                    {stock} {x.unit ?? ''}
                  </Text>
                  <StatusChip
                    label={stock <= 0 ? 'OUT' : stock <= min ? 'LOW' : 'OK'}
                    tone={stock <= 0 ? 'danger' : stock <= min ? 'warn' : 'success'}
                  />
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heading: { fontSize: 17, fontWeight: '900', color: theme.colors.text, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '800', color: theme.colors.text },
  muted: { color: theme.colors.muted, marginTop: 4 },
  stock: { fontWeight: '900', color: theme.colors.primary },
});
