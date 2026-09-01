import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, PrimaryButton, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

export default function InventoryWasteScreen() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<any[]>('/inventory/items'),
  });
  const { data: report } = useQuery({
    queryKey: ['inv-waste'],
    queryFn: () => api.get<any>('/inventory/waste?days=30'),
  });
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('SPOILAGE');
  const save = useMutation({
    mutationFn: () =>
      api.post(`/inventory/items/${itemId}/waste`, { quantity: Number(qty), reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-waste'] });
      Alert.alert('Recorded', 'Stock reduced for waste');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.h}>
          Waste this month {formatInr(report?.wasteThisMonth ?? report?.totalLoss ?? 0)}
        </Text>
        {items.map((i) => (
          <Pressable key={i.id} onPress={() => setItemId(i.id)}>
            <Card style={itemId === i.id ? styles.sel : undefined}>
              <Text>{i.name}</Text>
            </Card>
          </Pressable>
        ))}
        {['SPOILAGE', 'EXPIRED', 'DAMAGED', 'COOKING_LOSS', 'OVERPRODUCTION', 'OTHER'].map((r) => (
          <Pressable key={r} onPress={() => setReason(r)}>
            <Text style={reason === r ? styles.selText : styles.opt}>{r}</Text>
          </Pressable>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Quantity"
          keyboardType="decimal-pad"
          value={qty}
          onChangeText={setQty}
        />
        <PrimaryButton title="Record waste" onPress={() => save.mutate()} />
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8, paddingBottom: 40 },
  h: { fontWeight: '800', color: theme.colors.primary },
  sel: { borderWidth: 2, borderColor: theme.colors.primary },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  opt: { padding: 6, color: theme.colors.muted },
  selText: { padding: 6, fontWeight: '800', color: theme.colors.primary },
});
