import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen, StatusChip } from '@/ui';
import { theme, timeAgo } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.customers ?? []));
export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const query = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      api.get<any>(
        `/customers?limit=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`,
      ),
  });
  return (
    <Screen>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, phone, or email"
        placeholderTextColor={theme.colors.muted}
      />
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(c: any) => c.id}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No customers found" onRetry={query.refetch} />}
        renderItem={({ item: c }: any) => (
          <Card onPress={() => router.push(`/customers/${c.id}` as any)}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.name ?? 'Guest customer'}</Text>
                <Text style={styles.muted}>{c.phone ?? c.email ?? 'No contact details'}</Text>
                <Text style={styles.muted}>
                  {c.orderCount ?? c._count?.orders ?? 0} orders · Last{' '}
                  {c.lastOrderAt ? timeAgo(c.lastOrderAt) : '—'}
                </Text>
              </View>
              {c.isBlocked ? (
                <StatusChip label="BLOCKED" tone="danger" />
              ) : (
                <StatusChip label="ACTIVE" tone="success" />
              )}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    color: theme.colors.text,
  },
  list: { padding: 12, paddingTop: 0, gap: 10 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  name: { fontWeight: '800', fontSize: 16, color: theme.colors.text },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
});
