import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) =>
  Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.offers ?? d?.coupons ?? []);
export default function OffersScreen() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const [offers, coupons] = await Promise.allSettled([
        api.get<any>('/offers'),
        api.get<any>('/coupons'),
      ]);
      return [
        ...(offers.status === 'fulfilled'
          ? rowsOf(offers.value).map((x: any) => ({ ...x, resource: 'offers' }))
          : []),
        ...(coupons.status === 'fulfilled'
          ? rowsOf(coupons.value).map((x: any) => ({ ...x, resource: 'coupons' }))
          : []),
      ];
    },
  });
  const toggle = useMutation({
    mutationFn: (x: any) => api.patch(`/${x.resource}/${x.id}`, { isActive: !x.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offers'] }),
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });
  return (
    <Screen>
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(x: any) => `${x.resource}-${x.id}`}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No offers or coupons" onRetry={query.refetch} />}
        renderItem={({ item: x }: any) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{x.name ?? x.title ?? x.code}</Text>
                <Text style={styles.code}>{x.code ?? x.type ?? x.resource.toUpperCase()}</Text>
                <Text style={styles.muted}>
                  {x.description ??
                    `${x.discountValue ?? x.value ?? 0}${x.discountType === 'PERCENTAGE' ? '%' : '₹'} discount`}
                </Text>
              </View>
              <View style={styles.right}>
                <StatusChip
                  label={x.isActive ? 'ACTIVE' : 'INACTIVE'}
                  tone={x.isActive ? 'success' : 'neutral'}
                />
                <Switch
                  value={!!x.isActive}
                  onValueChange={() => toggle.mutate(x)}
                  trackColor={{ true: theme.colors.success }}
                />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  name: { fontWeight: '900', color: theme.colors.text, fontSize: 16 },
  code: { color: theme.colors.primary, fontWeight: '800', marginTop: 4 },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 5 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
});
