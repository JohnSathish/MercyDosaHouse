import { useQuery } from '@tanstack/react-query';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InvoiceListItemDto } from '@mdh/types';
import { INVOICE_STATUS_LABELS } from '@mdh/types';
import { api } from '@/lib/api';
import { formatCurrency } from '@mdh/utils';
import { COLORS } from '@/ui/theme';

export default function CustomerInvoicesScreen() {
  const insets = useSafeAreaInsets();
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get<InvoiceListItemDto[]>('/invoices/mine'),
  });

  async function openPdf(id: string) {
    const { url } = await api.get<{ url: string }>(`/invoices/mine/${id}/link`);
    await Linking.openURL(url);
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Invoices</Text>
      {isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? (
        <Pressable onPress={() => void refetch()}>
          <Text style={styles.muted}>Could not load invoices. Tap to retry.</Text>
        </Pressable>
      ) : null}
      {!isLoading && !data.length ? (
        <Text style={styles.muted}>No invoices are linked to your account yet.</Text>
      ) : null}
      {data.map((inv) => (
        <View key={inv.id} style={styles.card}>
          <Text style={styles.number}>{inv.invoiceNumber}</Text>
          <Text style={styles.meta}>
            {INVOICE_STATUS_LABELS[inv.status]} · {formatCurrency(inv.grandTotal)}
          </Text>
          <Pressable onPress={() => void openPdf(inv.id)}>
            <Text style={styles.link}>View / Download</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#FFF7E6', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 12 },
  muted: { color: '#6B7280', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10 },
  number: { fontWeight: '800', color: COLORS.primary, fontSize: 16 },
  meta: { color: '#6B7280', marginTop: 4 },
  link: { color: COLORS.primary, fontWeight: '700', marginTop: 10 },
});
