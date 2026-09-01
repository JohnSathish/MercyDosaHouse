import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '@/lib/api';
import { Card, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

export default function InventoryReportsScreen() {
  const { data: rows = [] } = useQuery({
    queryKey: ['inv-rep'],
    queryFn: () => api.get<any[]>('/inventory/reports?type=valuation'),
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        {rows.map((r) => (
          <Card key={r.sku ?? r.ingredient}>
            <Text style={styles.name}>{r.ingredient}</Text>
            <Text style={styles.muted}>
              {r.quantity} {r.unit} · {formatInr(r.totalValue)}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  name: { fontWeight: '800' },
  muted: { color: theme.colors.muted, marginTop: 4 },
});
