import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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

export default function FavoritesScreen() {
  const colors = useThemeColors();

  const {
    data: favorites = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<Product[]>('/users/me/favorites'),
    retry: false,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Favorites</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.empty}>Sign in to save favorites.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {favorites.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
          {!favorites.length ? (
            <Text style={styles.empty}>No favorites yet. Tap ❤️ on any dish!</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
});
