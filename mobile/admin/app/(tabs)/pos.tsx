import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { AppHeader, Card, EmptyState, Money, PrimaryButton, Screen, StatusChip } from '@/ui';
import { theme, timeAgo } from '@/ui/theme';
import { canUsePos } from '@/lib/roles';
import { useAuth } from '@/providers/auth-provider';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? []));
export default function PosEntryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const held = useQuery({
    queryKey: ['pos-held-bills'],
    queryFn: async () => {
      try {
        return await api.get<any>('/pos/bills?status=HELD&limit=20');
      } catch {
        try {
          return await api.get<any>('/pos/bills?status=OPEN&limit=20');
        } catch {
          return api.get<any>('/pos/bills?status=DRAFT&limit=20');
        }
      }
    },
    enabled: canUsePos(user),
  });
  if (!canUsePos(user))
    return (
      <Screen>
        <AppHeader title="POS" />
        <EmptyState title="POS access required" message="Ask a manager to update your role." />
      </Screen>
    );
  return (
    <Screen>
      <AppHeader title="Point of Sale" subtitle="Fast billing and settlement" />
      <View style={styles.hero}>
        <Text style={styles.big}>Ready to take an order?</Text>
        <Text style={styles.muted}>Create dine-in, takeaway, or delivery bills.</Text>
        <PrimaryButton
          title="Open Full POS"
          onPress={() => router.push('/pos' as any)}
          style={{ marginTop: 16 }}
        />
      </View>
      <Text style={styles.heading}>Held / open bills</Text>
      <FlatList
        data={rowsOf(held.data)}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No held bills" message="Held bills will appear here." />
        }
        renderItem={({ item: b }: any) => (
          <Card>
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>#{b.orderNumber}</Text>
                <Text style={styles.muted}>
                  {b.table?.name ?? b.orderType} · {timeAgo(b.updatedAt ?? b.createdAt)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <Money value={b.total ?? b.grandTotal} />
                <StatusChip label={b.status ?? 'OPEN'} tone="warn" />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    margin: 16,
    backgroundColor: '#ECFDF5',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  big: { fontSize: 21, fontWeight: '900', color: theme.colors.primary },
  muted: { color: theme.colors.muted, marginTop: 4 },
  heading: { marginHorizontal: 16, fontSize: 17, fontWeight: '800', color: theme.colors.text },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '800', color: theme.colors.text },
});
