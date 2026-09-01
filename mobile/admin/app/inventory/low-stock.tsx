import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function LowStockScreen() {
  const router = useRouter();
  const { data: items = [], refetch } = useQuery({
    queryKey: ['inv-low'],
    queryFn: () => api.get<any[]>('/inventory/items?lowStock=true'),
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list} refreshControl={undefined}>
        {!items.length ? (
          <EmptyState title="All stock levels are healthy" onRetry={refetch} />
        ) : null}
        {items.map((i) => (
          <Pressable key={i.id} onPress={() => router.push('/inventory/purchase-orders' as any)}>
            <Card>
              <Text style={styles.name}>{i.name}</Text>
              <Text style={styles.warn}>
                Current {i.currentStock} {i.unit} · Min {i.minStock} {i.unit}
              </Text>
              <Text style={styles.link}>Create purchase order</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  name: { fontWeight: '800' },
  warn: { color: theme.colors.danger, marginTop: 4 },
  link: { color: theme.colors.primary, fontWeight: '700', marginTop: 8 },
});
