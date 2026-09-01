import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '@/lib/api';
import { Card, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function ExpiryScreen() {
  const { data } = useQuery({
    queryKey: ['inv-exp'],
    queryFn: () => api.get<any>('/inventory/expiry-buckets'),
  });
  const sections = [
    ['Expired', data?.expired],
    ['Today', data?.today],
    ['Within 3 days', data?.within3],
    ['Within 7 days', data?.within7],
  ] as const;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        {sections.map(([title, rows]) => (
          <Card key={title}>
            <Text style={styles.h}>{title}</Text>
            {!rows?.length ? <Text style={styles.muted}>None</Text> : null}
            {rows?.map((b: any) => (
              <Text key={b.id} style={styles.row}>
                {b.itemName} · {b.remainingQty} {b.unit}
                {b.daysLeft != null ? ` · ${b.daysLeft}d` : ''}
              </Text>
            ))}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  h: { fontWeight: '800', color: theme.colors.primary },
  muted: { color: theme.colors.muted, marginTop: 6 },
  row: { marginTop: 6 },
});
