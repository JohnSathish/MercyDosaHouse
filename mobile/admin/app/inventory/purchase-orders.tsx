import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function InventoryPoScreen() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ['pos-list'],
    queryFn: () => api.get<any[]>('/inventory/purchase-orders'),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['inv-sup'],
    queryFn: () => api.get<any[]>('/inventory/suppliers'),
  });
  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => api.get<any[]>('/inventory/items'),
  });
  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () =>
      api.post('/inventory/purchase-orders', {
        supplierId,
        items: [{ itemId, quantity: Number(qty), rate: Number(rate) }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-list'] });
      Alert.alert('Created', 'Purchase order saved as draft');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });
  const markOrdered = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/inventory/purchase-orders/${id}/status`, { status: 'ORDERED' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-list'] }),
  });
  const receive = useMutation({
    mutationFn: (po: any) =>
      api.post('/inventory/grn', {
        poId: po.id,
        items: po.items.map((i: any) => ({
          itemId: i.itemId,
          receivedQty: Number(recvQty[i.itemId] ?? i.quantity),
          acceptedQty: Number(recvQty[i.itemId] ?? i.quantity),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      Alert.alert('Received', 'Stock increased by the received quantity');
    },
    onError: (e: Error) => Alert.alert('Failed', e.message),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.h}>Create purchase order</Text>
        <Text style={styles.label}>Supplier</Text>
        {suppliers.map((s) => (
          <Pressable key={s.id} onPress={() => setSupplierId(s.id)}>
            <Card style={supplierId === s.id ? styles.selected : undefined}>
              <Text style={styles.name}>{s.name}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={styles.label}>Ingredient</Text>
        {items.map((i) => (
          <Pressable
            key={i.id}
            onPress={() => {
              setItemId(i.id);
              setRate(String(i.costPrice));
            }}
          >
            <Card style={itemId === i.id ? styles.selected : undefined}>
              <Text style={styles.name}>
                {i.name} · {i.unit}
              </Text>
            </Card>
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
          placeholder="Rate"
          keyboardType="decimal-pad"
          value={rate}
          onChangeText={setRate}
        />
        <PrimaryButton title="Save draft" onPress={() => create.mutate()} />

        <Text style={styles.h}>Purchase orders</Text>
        {orders.map((po) => (
          <Card key={po.id}>
            <Text style={styles.name}>{po.poNumber}</Text>
            <Text style={styles.muted}>
              {po.supplier?.name} · {po.status}
            </Text>
            {po.items?.map((i: any) => (
              <Text key={i.itemId} style={styles.muted}>
                {i.item?.name}: ordered {Number(i.quantity)} / received {Number(i.receivedQty)}
              </Text>
            ))}
            {po.status === 'DRAFT' ? (
              <PrimaryButton title="Mark ordered" onPress={() => markOrdered.mutate(po.id)} />
            ) : null}
            {po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED' ? (
              <>
                {po.items?.map((i: any) => (
                  <TextInput
                    key={i.itemId}
                    style={styles.input}
                    placeholder={`Receive ${i.item?.name}`}
                    keyboardType="decimal-pad"
                    value={recvQty[i.itemId] ?? ''}
                    onChangeText={(v) => setRecvQty((q) => ({ ...q, [i.itemId]: v }))}
                  />
                ))}
                <PrimaryButton title="Receive stock" onPress={() => receive.mutate(po)} />
              </>
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 8, paddingBottom: 48 },
  h: { fontWeight: '800', color: theme.colors.primary, marginTop: 10 },
  label: { fontWeight: '700', fontSize: 12, color: theme.colors.muted },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  name: { fontWeight: '800' },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  selected: { borderWidth: 2, borderColor: theme.colors.primary },
});
