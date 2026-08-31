import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodCard, FoodCardSkeleton, SearchBar, type FoodCardProduct } from '@/ui';
import { OrderChargesCard } from '@/components/order-charges-card';
import { AppExclusiveBadge } from '@/components/app-exclusive-badge';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';
import { useCartStore } from '@/stores/cart-store';
import { useOrderPricing } from '@/hooks/use-order-pricing';
import { COLORS, RADIUS } from '@/ui/theme';

interface Category {
  id: string;
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
}

function asCategoryList(raw: unknown): Category[] {
  if (Array.isArray(raw)) return raw as Category[];
  if (raw && typeof raw === 'object') {
    const obj = raw as { data?: unknown; items?: unknown; categories?: unknown };
    const list = obj.data ?? obj.items ?? obj.categories;
    if (Array.isArray(list)) return list as Category[];
  }
  return [];
}

function categoryLabel(cat: Category): string {
  const name = (cat.name || cat.slug || '').trim();
  const icon = cat.icon && cat.icon.length <= 4 && !cat.icon.includes('/') ? cat.icon : '';
  return `${icon ? `${icon} ` : ''}${name || 'Category'}`;
}

type FoodFilter = 'ALL' | 'VEG' | 'NON_VEG';

export default function MenuScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const subtotal = useCartStore((s) => s.subtotal());
  const pricing = useOrderPricing();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(
    typeof params.categoryId === 'string' ? params.categoryId : undefined,
  );
  const [foodFilter, setFoodFilter] = useState<FoodFilter>('ALL');

  useEffect(() => {
    if (typeof params.categoryId === 'string' && params.categoryId) {
      setCategoryId(params.categoryId);
    }
  }, [params.categoryId]);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () => api.get<unknown>('/categories?active=true&channel=mobile'),
  });
  const categories = useMemo(
    () => asCategoryList(categoriesRaw).filter((c) => c.id),
    [categoriesRaw],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['products', categoryId, search, foodFilter],
    queryFn: () => {
      const q = new URLSearchParams({ available: 'true', limit: '50' });
      if (categoryId) q.set('categoryId', categoryId);
      if (search.trim()) q.set('search', search.trim());
      if (foodFilter !== 'ALL') q.set('foodType', foodFilter);
      return api.list<FoodCardProduct>(`/products?${q.toString()}`);
    },
  });

  const products = data?.data ?? [];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Menu</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search for dosa…" />
      </View>

      <View style={styles.chargesWrap}>
        <AppExclusiveBadge />
        <OrderChargesCard deliveryIsFree={subtotal > 0 ? pricing.deliveryIsFree : false} compact />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        <Pressable
          onPress={() => setCategoryId(undefined)}
          style={[styles.filterChip, !categoryId && { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.filterText, !categoryId && styles.filterTextActive]}>All</Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setCategoryId(cat.id)}
            style={[
              styles.filterChip,
              categoryId === cat.id && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[styles.filterText, categoryId === cat.id && styles.filterTextActive]}
              numberOfLines={1}
            >
              {categoryLabel(cat)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.vegRow}>
        {(['ALL', 'VEG', 'NON_VEG'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFoodFilter(f)}
            style={[styles.vegChip, foodFilter === f && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.filterText, foodFilter === f && styles.filterTextActive]}>
              {f === 'ALL' ? '🍽️ All' : f === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? (
          <>
            <FoodCardSkeleton />
            <FoodCardSkeleton />
            <FoodCardSkeleton />
          </>
        ) : (
          <>
            {products.map((p) => (
              <FoodCard key={p.id} product={p} showFavorite />
            ))}
            {!products.length ? <Text style={styles.empty}>No items found.</Text> : null}
          </>
        )}
        <View style={{ height: 96 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  chargesWrap: { paddingHorizontal: 16, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  filters: { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 16, alignItems: 'center', paddingVertical: 2 },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 0 },
  filterTextActive: { color: '#fff' },
  vegRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  vegChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  list: { padding: 16, paddingTop: 0 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
});
