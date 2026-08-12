import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import {
  Card,
  EmptyState,
  KpiCard,
  LoadingBlock,
  Money,
  PrimaryButton,
  Screen,
  StatusChip,
} from '@/ui';
import { theme, timeAgo } from '@/ui/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<any>(`/customers/${id}`),
    enabled: !!id,
  });
  if (query.isLoading)
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  const c = query.data;
  if (!c)
    return (
      <Screen>
        <EmptyState title="Customer not found" onRetry={query.refetch} />
      </Screen>
    );
  const orders = c.orders ?? c.recentOrders ?? [];
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.row}>
            <View>
              <Text style={styles.title}>{c.name ?? 'Guest customer'}</Text>
              <Text style={styles.muted}>{c.phone}</Text>
              <Text style={styles.muted}>{c.email}</Text>
            </View>
            <StatusChip
              label={c.isBlocked ? 'BLOCKED' : 'ACTIVE'}
              tone={c.isBlocked ? 'danger' : 'success'}
            />
          </View>
        </Card>
        <View style={styles.grid}>
          <KpiCard label="Orders" value={c.orderCount ?? c._count?.orders ?? orders.length} />
          <KpiCard
            label="Lifetime value"
            value={`₹${Number(c.lifetimeValue ?? c.totalSpent ?? 0).toLocaleString('en-IN')}`}
          />
          <KpiCard label="Reward points" value={c.rewardPoints ?? c.loyaltyPoints ?? 0} />
        </View>
        {(c.addresses ?? []).map((a: any) => (
          <Card key={a.id}>
            <Text style={styles.heading}>{a.label ?? 'Address'}</Text>
            <Text style={styles.text}>
              {[a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(', ')}
            </Text>
          </Card>
        ))}
        <Text style={styles.heading}>Recent orders</Text>
        {orders.map((o: any) => (
          <Card key={o.id} onPress={() => router.push(`/orders/${o.id}` as any)}>
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>#{o.orderNumber}</Text>
                <Text style={styles.muted}>
                  {timeAgo(o.createdAt)} · {o.status}
                </Text>
              </View>
              <Money value={o.total ?? o.grandTotal} />
            </View>
          </Card>
        ))}
        <PrimaryButton title="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.text },
  muted: { color: theme.colors.muted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heading: { fontWeight: '800', color: theme.colors.primary, fontSize: 16 },
  text: { color: theme.colors.text, marginTop: 7, lineHeight: 20 },
  name: { fontWeight: '800', color: theme.colors.text },
});
