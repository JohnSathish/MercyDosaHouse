import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { api } from '@/lib/api';
import { PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function InventoryItemFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['inv-cat'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/inventory/categories'),
  });
  const { data: item } = useQuery({
    queryKey: ['inv-item', id],
    queryFn: () => api.get<any>(`/inventory/items/${id}`),
    enabled: Boolean(id),
  });
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('KG');
  const [minStock, setMin] = useState('0');
  const [cost, setCost] = useState('0');
  const [opening, setOpening] = useState('0');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setSku(item.sku);
    setBarcode(item.barcode ?? '');
    setUnit(item.unit);
    setMin(String(item.minStock));
    setCost(String(item.costPrice));
    setCategoryId(item.categoryId);
  }, [item]);
  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        sku,
        barcode: barcode || undefined,
        unit,
        minStock: Number(minStock),
        costPrice: Number(cost),
        categoryId,
        ...(id ? {} : { currentStock: Number(opening) }),
      };
      return id ? api.patch(`/inventory/items/${id}`, body) : api.post('/inventory/items', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Ingredient name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>SKU</Text>
        <TextInput style={styles.input} value={sku} onChangeText={setSku} />
        <Text style={styles.label}>Barcode</Text>
        <TextInput
          style={styles.input}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Scan or type"
        />
        <Text style={styles.label}>
          Unit (KG, GRAM, LITRE, ML, PIECE, PACKET, BOX, BOTTLE, DOZEN)
        </Text>
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          autoCapitalize="characters"
        />
        {!id ? (
          <>
            <Text style={styles.label}>Opening stock</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={opening}
              onChangeText={setOpening}
            />
          </>
        ) : null}
        <Text style={styles.label}>Minimum stock</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={minStock}
          onChangeText={setMin}
        />
        <Text style={styles.label}>Cost per unit</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={cost}
          onChangeText={setCost}
        />
        <PrimaryButton title={save.isPending ? 'Saving…' : 'Save'} onPress={() => save.mutate()} />
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { padding: 16, gap: 8, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.muted, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
});
