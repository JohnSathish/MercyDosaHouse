import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
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
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

interface Product {
  id: string;
  name: string;
  price: number;
  prepTimeMinutes?: number;
}

export default function SearchScreen() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => {
      const params = new URLSearchParams({ available: 'true', limit: '30' });
      if (query.trim()) params.set('search', query.trim());
      return api.list<Product>(`/products?${params.toString()}`);
    },
    enabled: query.trim().length >= 2,
  });

  const products = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <TextInput
          style={styles.search}
          placeholder="Search dishes…"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {query.trim().length < 2 ? (
          <Text style={styles.hint}>Type at least 2 characters to search.</Text>
        ) : isLoading || isFetching ? (
          <ActivityIndicator color={colors.primary} />
        ) : products.length ? (
          products.map((p) => <ProductRow key={p.id} product={p} />)
        ) : (
          <Text style={styles.hint}>No results for "{query}"</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16, paddingBottom: 8 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  content: { padding: 16, paddingTop: 0 },
  hint: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
});
