import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoodCard, FoodCardSkeleton, SearchBar, type FoodCardProduct } from '@/ui';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';
import { COLORS } from '@/ui/theme';

const SUGGESTIONS = ['Dosa', 'Idli', 'Biryani', 'Chicken', 'Vada', 'Masala'];

export default function SearchScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => {
      const p = new URLSearchParams({ available: 'true', limit: '30' });
      if (query.trim()) p.set('search', query.trim());
      return api.list<FoodCardProduct>(`/products?${p.toString()}`);
    },
    enabled: query.trim().length >= 2,
  });

  const products = data?.data ?? [];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <SearchBar value={query} onChangeText={setQuery} autoFocus />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {query.trim().length < 2 ? (
          <>
            <Text style={styles.hint}>Popular searches</Text>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => setQuery(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : isLoading || isFetching ? (
          <>
            <FoodCardSkeleton />
            <FoodCardSkeleton />
          </>
        ) : products.length ? (
          <>
            <Text style={[styles.resultsLabel, { color: colors.primary }]}>Top Results</Text>
            {products.map((p) => (
              <FoodCard key={p.id} product={p} />
            ))}
          </>
        ) : (
          <Text style={styles.hint}>No results for “{query}”</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  back: { fontWeight: '600', marginBottom: 4 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  hint: { color: COLORS.textMuted, marginTop: 16, marginBottom: 10, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  resultsLabel: { fontWeight: '800', marginBottom: 10 },
});
