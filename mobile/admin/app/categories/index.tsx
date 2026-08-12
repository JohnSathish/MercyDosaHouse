import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.categories ?? []));
export default function CategoriesScreen() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const query = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => {
      try {
        return await api.get<any>('/categories/admin');
      } catch {
        return api.get<any>('/categories');
      }
    },
  });
  const create = useMutation({
    mutationFn: () => api.post('/categories', { name: name.trim(), isActive: true }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['categories-admin'] });
    },
    onError: (e: Error) => Alert.alert('Create failed', e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: any) => api.patch(`/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories-admin'] }),
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });
  return (
    <Screen>
      <View style={styles.add}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="New category name"
          placeholderTextColor={theme.colors.muted}
        />
        <PrimaryButton
          title="Add"
          onPress={() => create.mutate()}
          disabled={!name.trim()}
          loading={create.isPending}
        />
      </View>
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(c: any) => c.id}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No categories" onRetry={query.refetch} />}
        renderItem={({ item: c }: any) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextInput
                  defaultValue={c.name}
                  onEndEditing={(e) => {
                    const next = e.nativeEvent.text.trim();
                    if (next && next !== c.name) update.mutate({ id: c.id, body: { name: next } });
                  }}
                  style={styles.nameInput}
                />
                <Text style={styles.muted}>
                  {c.productCount ?? c._count?.products ?? 0} products
                </Text>
              </View>
              <Switch
                value={c.isActive !== false}
                onValueChange={(isActive) => update.mutate({ id: c.id, body: { isActive } })}
                trackColor={{ true: theme.colors.success }}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { flexDirection: 'row', gap: 8, padding: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 11,
    backgroundColor: '#fff',
    color: theme.colors.text,
  },
  list: { padding: 12, paddingTop: 0, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: { fontWeight: '800', fontSize: 16, color: theme.colors.text, paddingVertical: 4 },
  muted: { color: theme.colors.muted, fontSize: 12 },
});
