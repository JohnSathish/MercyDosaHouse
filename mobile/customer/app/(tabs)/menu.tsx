import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProductRow } from '@/components/product-row';
import { OrderChargesCard } from '@/components/order-charges-card';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';
import { useCartStore } from '@/stores/cart-store';
import { useOrderPricing } from '@/hooks/use-order-pricing';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  packingCharge?: number;
  prepTimeMinutes?: number;
  foodType?: string;
}

type FoodFilter = 'ALL' | 'VEG' | 'NON_VEG';

export default function MenuScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const subtotal = useCartStore((s) => s.subtotal());
  const pricing = useOrderPricing();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId);
  const [foodFilter, setFoodFilter] = useState<FoodFilter>('ALL');

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () => api.get<Category[]>('/categories?active=true&channel=mobile'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', categoryId, search, foodFilter],
    queryFn: () => {
      const q = new URLSearchParams({ available: 'true', limit: '50' });
      if (categoryId) q.set('categoryId', categoryId);
      if (search.trim()) q.set('search', search.trim());
      if (foodFilter !== 'ALL') q.set('foodType', foodFilter);
      return api.list<Product>(`/products?${q.toString()}`);
    },
  });

  const products = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Menu</Text>
        <TextInput
          style={styles.search}
          placeholder="Search dishes…"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.chargesWrap}>
        <OrderChargesCard deliveryIsFree={subtotal > 0 ? pricing.deliveryIsFree : false} compact />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <Pressable onPress={() => setCategoryId(undefined)}>
          <Text style={[styles.filterChip, !categoryId && styles.filterActive]}>All</Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable key={cat.id} onPress={() => setCategoryId(cat.id)}>
            <Text style={[styles.filterChip, categoryId === cat.id && styles.filterActive]}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.vegRow}>
        {(['ALL', 'VEG', 'NON_VEG'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFoodFilter(f)}>
            <Text style={[styles.vegChip, foodFilter === f && styles.filterActive]}>
              {f === 'ALL' ? '🍽️ All' : f === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {products.map((p) => (
            <ProductRow key={p.id} product={p} showFavorite />
          ))}
          {!products.length ? <Text style={styles.empty}>No items found.</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16, paddingBottom: 8 },
  chargesWrap: { paddingHorizontal: 16, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filters: { paddingHorizontal: 16, maxHeight: 44, marginBottom: 8 },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  filterActive: { backgroundColor: '#14532D', color: '#fff' },
  vegRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  vegChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  list: { padding: 16, paddingTop: 0 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 24 },
});
