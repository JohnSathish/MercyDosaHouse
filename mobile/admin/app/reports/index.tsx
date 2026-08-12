import { useQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, KpiCard, LoadingBlock, Screen } from '@/ui';
import { formatInr, theme } from '@/ui/theme';

export default function ReportsScreen() {
  const query = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: async () => {
      try {
        return await api.get<any>('/reports/dashboard');
      } catch {
        return api.get<any>('/dashboard/stats');
      }
    },
    refetchInterval: 60_000,
  });
  const d = query.data ?? {};
  const s = d.stats ?? d;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />
        }
      >
        {query.isLoading ? (
          <LoadingBlock />
        ) : (
          <>
            <Text style={styles.heading}>Business snapshot</Text>
            <View style={styles.grid}>
              <KpiCard
                label="Gross sales"
                value={formatInr(s.grossSales ?? s.revenueToday ?? s.totalRevenue)}
              />
              <KpiCard
                label="Net sales"
                value={formatInr(s.netSales ?? s.netRevenue ?? s.revenueToday)}
                accent={theme.colors.success}
              />
              <KpiCard label="Orders" value={s.totalOrders ?? s.ordersToday ?? 0} />
              <KpiCard
                label="Average order"
                value={formatInr(
                  s.averageOrderValue ??
                    s.aov ??
                    Number(s.totalRevenue || s.revenueToday) /
                      Math.max(1, Number(s.totalOrders || s.ordersToday)),
                )}
              />
              <KpiCard
                label="Cancelled"
                value={s.cancelledOrders ?? s.cancelled ?? 0}
                accent={theme.colors.danger}
              />
              <KpiCard label="Customers" value={s.customers ?? s.customersToday ?? 0} />
            </View>
            <Text style={styles.heading}>Performance</Text>
            <Card>
              {Object.entries(d.summary ?? d.performance ?? {}).map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.label}>{k.replace(/([A-Z])/g, ' $1')}</Text>
                  <Text style={styles.value}>
                    {typeof v === 'number' ? v.toLocaleString('en-IN') : String(v ?? '—')}
                  </Text>
                </View>
              ))}
              {!Object.keys(d.summary ?? d.performance ?? {}).length ? (
                <Text style={styles.muted}>
                  Extended reporting data will appear when the reports dashboard provides a summary.
                </Text>
              ) : null}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  label: { textTransform: 'capitalize', color: theme.colors.muted },
  value: { fontWeight: '800', color: theme.colors.text },
  muted: { color: theme.colors.muted, textAlign: 'center' },
});
