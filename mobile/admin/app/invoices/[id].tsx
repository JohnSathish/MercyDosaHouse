import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InvoiceDto } from '@mdh/types';
import { INVOICE_STATUS_LABELS } from '@mdh/types';
import { api } from '@/lib/api';
import { Card, LoadingBlock, PrimaryButton, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');
  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<InvoiceDto>(`/invoices/${id}`),
  });
  const share = useMutation({
    mutationFn: () => api.post<{ url: string }>(`/invoices/${id}/share`, {}),
    onSuccess: (res) => Linking.openURL(res.url),
    onError: (e: Error) => Alert.alert('PDF', e.message),
  });
  const sendEmail = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/email`, { to: email || inv?.email }),
    onSuccess: () => Alert.alert('Email', 'Invoice emailed.'),
    onError: (e: Error) => Alert.alert('Email', e.message),
  });
  const sendWa = useMutation({
    mutationFn: () =>
      api.post<{ sent: boolean; fallbackUrl?: string }>(`/invoices/${id}/whatsapp`, {
        whatsapp: wa || inv?.whatsapp || inv?.phone,
      }),
    onSuccess: (res) => {
      if (res.fallbackUrl) void Linking.openURL(res.fallbackUrl);
      else Alert.alert('WhatsApp', 'Invoice sent.');
    },
    onError: (e: Error) => Alert.alert('WhatsApp', e.message),
  });

  if (isLoading || !inv) {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Text style={styles.total}>{formatInr(inv.grandTotal)}</Text>
          <Text style={styles.status}>{INVOICE_STATUS_LABELS[inv.status]}</Text>
          <Text style={styles.meta}>
            Paid {formatInr(inv.amountPaid)} · Balance {formatInr(inv.balanceDue)}
          </Text>
        </Card>
        {inv.items.map((item) => (
          <Card key={item.id} style={{ marginTop: 8 }}>
            <Text style={styles.item}>{item.description}</Text>
            <Text style={styles.meta}>
              {item.quantity} × {formatInr(item.unitPrice)} = {formatInr(item.amount)}
            </Text>
          </Card>
        ))}
        <PrimaryButton
          title="Download / Preview PDF"
          onPress={() => share.mutate()}
          loading={share.isPending}
          style={{ marginTop: 16 }}
        />
        <TextInput
          style={styles.input}
          placeholder={inv.email || 'Email'}
          value={email}
          onChangeText={setEmail}
        />
        <PrimaryButton
          title="Send Email"
          variant="ghost"
          onPress={() => sendEmail.mutate()}
          loading={sendEmail.isPending}
        />
        <TextInput
          style={styles.input}
          placeholder={inv.whatsapp || inv.phone || 'WhatsApp'}
          value={wa}
          onChangeText={setWa}
        />
        <PrimaryButton
          title="Send WhatsApp"
          variant="ghost"
          onPress={() => sendWa.mutate()}
          loading={sendWa.isPending}
        />
        <PrimaryButton
          title="Record full payment (UPI)"
          variant="secondary"
          onPress={() => {
            if (inv.balanceDue <= 0) return;
            api
              .post(`/invoices/${id}/payments`, { amount: inv.balanceDue, method: 'UPI' })
              .then(() => qc.invalidateQueries({ queryKey: ['invoice', id] }))
              .catch((e: Error) => Alert.alert('Payment', e.message));
          }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  total: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
  status: { fontWeight: '700', marginTop: 4 },
  meta: { color: theme.colors.muted, marginTop: 4 },
  item: { fontWeight: '700' },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
});
