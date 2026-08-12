import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { canManageMenu } from '@/lib/roles';
import { useAuth } from '@/providers/auth-provider';
import {
  AppHeader,
  Card,
  EmptyState,
  LoadingBlock,
  Money,
  PrimaryButton,
  Screen,
  StatusChip,
} from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? []));
export default function MenuScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<any>('/products?limit=100'),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: any) => api.patch(`/products/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });
  const q = search.toLowerCase();
  const rows = rowsOf(query.data).filter(
    (p: any) =>
      !q || p.name?.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q),
  );
  return (
    <Screen>
      <AppHeader
        title="Menu"
        subtitle={`${rows.length} products`}
        right={
          canManageMenu(user) ? (
            <PrimaryButton
              title="+ Add"
              variant="secondary"
              onPress={() => router.push('/menu/new' as any)}
            />
          ) : undefined
        }
      />
      <TextInput
        style={styles.search}
        placeholder="Search products"
        placeholderTextColor={theme.colors.muted}
        value={search}
        onChangeText={setSearch}
      />
      {query.isLoading ? (
        <LoadingBlock />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p: any) => p.id}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No products found" onRetry={query.refetch} />}
          renderItem={({ item: p }: any) => (
            <Card onPress={() => canManageMenu(user) && router.push(`/menu/${p.id}` as any)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {p.isVeg === false ? '🔴' : '🟢'} {p.name}
                  </Text>
                  <Text style={styles.muted}>
                    {p.category?.name ?? p.categoryName ?? 'Uncategorised'}
                  </Text>
                  <Money value={p.price ?? p.sellingPrice} />
                </View>
                <View style={styles.right}>
                  <StatusChip
                    label={p.isActive ? 'ACTIVE' : 'HIDDEN'}
                    tone={p.isActive ? 'success' : 'neutral'}
                  />
                  {canManageMenu(user) ? (
                    <Switch
                      value={!!p.isActive}
                      onValueChange={(isActive) => toggle.mutate({ id: p.id, isActive })}
                      trackColor={{ true: theme.colors.success }}
                    />
                  ) : null}
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
  },
  list: { padding: 12, paddingTop: 0, gap: 10, paddingBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontWeight: '800', fontSize: 15, color: theme.colors.text },
  muted: { color: theme.colors.muted, fontSize: 12, marginVertical: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
});
