import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

export default function InventoryItemsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['inventory-items', search],
    queryFn: () =>
      api.get<any[]>(`/inventory/items${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
  const rows = query.data ?? [];
  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        ListHeaderComponent={
          <TextInput
            placeholder="Search name, SKU, barcode"
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />
        }
        ListEmptyComponent={
          <EmptyState title="No ingredients added yet." onRetry={query.refetch} />
        }
        renderItem={({ item: x }) => (
          <Pressable onPress={() => router.push(`/inventory/item-form?id=${x.id}` as any)}>
            <Card>
              <View style={styles.row}>
                <View>
                  <Text style={styles.name}>{x.name}</Text>
                  <Text style={styles.muted}>{x.sku}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.stock}>
                    {x.currentStock} {x.unit}
                  </Text>
                  <StatusChip
                    label={
                      x.status === 'OUT_OF_STOCK' ? 'OUT' : x.status === 'LOW_STOCK' ? 'LOW' : 'OK'
                    }
                    tone={
                      x.status === 'OUT_OF_STOCK'
                        ? 'danger'
                        : x.status === 'LOW_STOCK'
                          ? 'warn'
                          : 'success'
                    }
                  />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  search: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontWeight: '800', color: theme.colors.text },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  stock: { fontWeight: '800', color: theme.colors.primary },
});
