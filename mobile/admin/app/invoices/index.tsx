import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { InvoiceListItemDto, InvoiceStatsDto, PaginatedResult } from '@mdh/types';
import { INVOICE_STATUS_LABELS } from '@mdh/types';
import { api } from '@/lib/api';
import { Card, EmptyState, PrimaryButton, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

export default function InvoicesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const stats = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => api.get<InvoiceStatsDto>('/invoices/stats'),
  });
  const list = useQuery({
    queryKey: ['invoices', search],
    queryFn: () =>
      api.get<PaginatedResult<InvoiceListItemDto>>(
        `/invoices?limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`,
      ),
  });
  const rows = list.data?.data ?? [];
  return (
    <Screen>
      <View style={styles.stats}>
        <Stat label="Today" value={formatInr(stats.data?.todayTotal ?? 0)} />
        <Stat label="Month" value={formatInr(stats.data?.monthTotal ?? 0)} />
        <Stat label="Due" value={formatInr(stats.data?.outstanding ?? 0)} />
      </View>
      <PrimaryButton
        title="+ Create Invoice"
        onPress={() => router.push('/invoices/new' as never)}
        style={{ marginHorizontal: 12 }}
      />
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoice, customer, phone"
        placeholderTextColor={theme.colors.muted}
      />
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshing={list.isRefetching}
        onRefresh={list.refetch}
        ListEmptyComponent={<EmptyState title="No invoices yet" onRetry={list.refetch} />}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/invoices/${item.id}` as never)}
            style={{ marginBottom: 10 }}
          >
            <Text style={styles.no}>{item.invoiceNumber}</Text>
            <Text style={styles.name}>{item.customerName}</Text>
            <Text style={styles.meta}>
              {formatInr(item.grandTotal)} · {INVOICE_STATUS_LABELS[item.status]}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10 },
  statLabel: { color: theme.colors.muted, fontSize: 11 },
  statValue: { fontWeight: '800', color: theme.colors.primary, marginTop: 4, fontSize: 12 },
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  no: { fontWeight: '800', color: theme.colors.primary },
  name: { marginTop: 4, fontWeight: '600' },
  meta: { color: theme.colors.muted, marginTop: 4, fontSize: 12 },
});
