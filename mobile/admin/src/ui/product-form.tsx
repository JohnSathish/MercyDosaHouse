import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { Card, LoadingBlock, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? []));
export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    name: '',
    price: '',
    description: '',
    categoryId: '',
    isVeg: true,
    isActive: true,
  });
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<any>(`/products/${id}`),
    enabled: !!id,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any>('/categories'),
  });
  useEffect(() => {
    if (product.data)
      setForm({
        ...product.data,
        price: String(product.data.price ?? product.data.sellingPrice ?? ''),
        categoryId: product.data.categoryId ?? product.data.category?.id ?? '',
      });
  }, [product.data]);
  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim() || !Number(form.price))
        throw new Error('Name and a valid price are required');
      const body = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        categoryId: form.categoryId || undefined,
        isVeg: form.isVeg,
        isActive: form.isActive,
      };
      return id ? api.patch(`/products/${id}`, body) : api.post('/products', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('Could not save product', e.message),
  });
  const set = (key: string, value: any) => setForm((x: any) => ({ ...x, [key]: value }));
  if (id && product.isLoading)
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Card>
            <Field
              label="Product name"
              value={form.name}
              onChangeText={(v: string) => set('name', v)}
            />
            <Field
              label="Price (₹)"
              value={form.price}
              onChangeText={(v: string) => set('price', v)}
              keyboardType="decimal-pad"
            />
            <Field
              label="Description"
              value={form.description ?? ''}
              onChangeText={(v: string) => set('description', v)}
              multiline
            />
            <Text style={styles.label}>Category</Text>
            <View style={styles.categories}>
              {rowsOf(categories.data).map((c: any) => (
                <Text
                  key={c.id}
                  onPress={() => set('categoryId', c.id)}
                  style={[styles.category, form.categoryId === c.id && styles.categoryOn]}
                >
                  {c.name}
                </Text>
              ))}
            </View>
            <Toggle
              label="Vegetarian"
              value={!!form.isVeg}
              onValueChange={(v: boolean) => set('isVeg', v)}
            />
            <Toggle
              label="Active on menu"
              value={!!form.isActive}
              onValueChange={(v: boolean) => set('isActive', v)}
            />
            <PrimaryButton
              title={id ? 'Save Changes' : 'Create Product'}
              onPress={() => save.mutate()}
              loading={save.isPending}
              style={{ marginTop: 16 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
        placeholderTextColor={theme.colors.muted}
      />
    </View>
  );
}
function Toggle({ label, ...props }: any) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.name}>{label}</Text>
      <Switch {...props} trackColor={{ true: theme.colors.success }} />
    </View>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16 },
  label: { fontSize: 12, fontWeight: '800', color: theme.colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  category: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 18,
    fontWeight: '600',
  },
  categoryOn: { backgroundColor: theme.colors.secondary, color: '#fff' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  name: { fontWeight: '700', color: theme.colors.text },
});
