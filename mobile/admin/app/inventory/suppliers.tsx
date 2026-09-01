import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, PrimaryButton, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';

export default function InventorySuppliersScreen() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ['inv-sup'],
    queryFn: () => api.get<any[]>('/inventory/suppliers?includeInactive=true'),
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const save = useMutation({
    mutationFn: () => api.post('/inventory/suppliers', { name, phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv-sup'] });
      setName('');
      setPhone('');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <TextInput
          style={styles.input}
          placeholder="Supplier name"
          value={name}
          onChangeText={setName}
        />
        <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} />
        <PrimaryButton title="Add supplier" onPress={() => save.mutate()} />
        {rows.map((s) => (
          <Card key={s.id}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.muted}>{s.phone ?? ''}</Text>
            <Text style={styles.name}>{formatInr(s.totalPurchases ?? 0)} purchased</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8, paddingBottom: 40 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  name: { fontWeight: '800' },
  muted: { color: theme.colors.muted, fontSize: 12 },
});
