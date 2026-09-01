import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, KpiCard, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

const LINKS = [
  ['Ingredients', '/inventory/items'],
  ['Add ingredient', '/inventory/item-form'],
  ['Purchase orders', '/inventory/purchase-orders'],
  ['Receive stock', '/inventory/purchase-orders'],
  ['Stock adjustment', '/inventory/adjust'],
  ['Suppliers', '/inventory/suppliers'],
  ['Waste', '/inventory/waste'],
  ['Low stock', '/inventory/low-stock'],
  ['Expiry', '/inventory/expiry'],
  ['Reports', '/inventory/reports'],
] as const;

export default function InventoryScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get<any>('/inventory/dashboard'),
    refetchInterval: 30_000,
  });
  const stats = query.data?.stats ?? {};
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.grid}>
          <KpiCard label="Stock value" value={formatInr(stats.stockValue ?? 0)} />
          <KpiCard label="Low stock" value={stats.lowStock ?? 0} accent={theme.colors.secondary} />
          <KpiCard
            label="Out of stock"
            value={stats.outOfStock ?? 0}
            accent={theme.colors.danger}
          />
          <KpiCard label="Expiring" value={stats.expiringSoon ?? 0} />
        </View>
        {!query.data && !query.isLoading ? (
          <EmptyState title="Could not load inventory" onRetry={query.refetch} />
        ) : null}
        <Text style={styles.heading}>Actions</Text>
        {LINKS.map(([label, href]) => (
          <Pressable key={href + label} onPress={() => router.push(href as any)}>
            <Card>
              <Text style={styles.link}>{label}</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 40, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { fontWeight: '800', color: theme.colors.primary, marginTop: 8, marginBottom: 4 },
  link: { fontWeight: '700', color: theme.colors.text },
});
