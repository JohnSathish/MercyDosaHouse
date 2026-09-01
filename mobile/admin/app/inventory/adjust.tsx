import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function InventoryAdjustScreen() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<any[]>('/inventory/items'),
  });
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('ADD');
  const [notes, setNotes] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api.post(`/inventory/items/${itemId}/adjust`, { quantity: Number(qty), reason, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      Alert.alert('Adjusted', 'A ledger entry was created');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((i) => (
          <Pressable key={i.id} onPress={() => setItemId(i.id)}>
            <Card style={itemId === i.id ? styles.sel : undefined}>
              <Text style={styles.name}>
                {i.name} · {i.currentStock} {i.unit}
              </Text>
            </Card>
          </Pressable>
        ))}
        {['ADD', 'REMOVE', 'CORRECTION', 'RETURN', 'TRANSFER'].map((r) => (
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
        <TextInput
          style={styles.input}
          placeholder="Reason / reference"
          value={notes}
          onChangeText={setNotes}
        />
        <PrimaryButton title="Apply adjustment" onPress={() => save.mutate()} />
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8, paddingBottom: 40 },
  name: { fontWeight: '700' },
  sel: { borderWidth: 2, borderColor: theme.colors.primary },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  opt: { padding: 8, color: theme.colors.muted },
  selText: { padding: 8, fontWeight: '800', color: theme.colors.primary },
});
