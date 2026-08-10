import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
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
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import { FavoriteButton } from '@/components/favorite-button';
import { useThemeColors } from '@/providers/config-context';

interface Variant {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  packingCharge?: number;
  prepTimeMinutes?: number;
  foodType?: string;
  ingredients?: string | null;
  isAvailable?: boolean;
  variants?: Variant[];
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<Product>(`/products/${id}`),
    enabled: !!id,
  });

  const variants = product?.variants?.filter((v) => v.isAvailable) ?? [];
  const activeVariant = selectedVariant ?? variants[0] ?? null;
  const unitPrice = activeVariant?.price ?? product?.price ?? 0;
  const packingCharge = product?.packingCharge ?? 20;

  if (isLoading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        variantId: activeVariant?.id,
        name: activeVariant ? `${product.name} (${activeVariant.name})` : product.name,
        price: unitPrice,
        packingCharge,
        notes: notes.trim() || undefined,
      },
      qty,
    );
    router.push('/(tabs)/cart');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <FavoriteButton productId={product.id} />
        </View>
        <View style={styles.hero}>
          <Text style={styles.emoji}>🥞</Text>
        </View>
        <Text style={[styles.name, { color: colors.primary }]}>{product.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.badge}>{product.foodType ?? 'VEG'}</Text>
          {product.prepTimeMinutes ? (
            <Text style={styles.meta}>⏱ {product.prepTimeMinutes} min</Text>
          ) : null}
        </View>
        {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
        {product.ingredients ? (
          <Text style={styles.ingredients}>Ingredients: {product.ingredients}</Text>
        ) : null}

        {variants.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Size</Text>
            <View style={styles.variantRow}>
              {variants.map((v) => (
                <Pressable
                  key={v.id}
                  style={[styles.variantChip, activeVariant?.id === v.id && styles.variantActive]}
                  onPress={() => setSelectedVariant(v)}
                >
                  <Text style={styles.variantName}>{v.name}</Text>
                  <Text style={styles.variantPrice}>{formatCurrency(v.price)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any preferences? (e.g. extra crispy)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={styles.qtySection}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
              <Text>−</Text>
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQty(qty + 1)}>
              <Text>+</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.price}>{formatCurrency(unitPrice * qty)}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.secondary }]}
          onPress={handleAdd}
        >
          <Text style={styles.addText}>Add to Cart — {formatCurrency(unitPrice * qty)}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  back: { color: '#14532D', fontWeight: '600' },
  hero: {
    alignItems: 'center',
    backgroundColor: '#14532D',
    borderRadius: 20,
    height: 180,
    justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: { fontSize: 64 },
  name: { fontSize: 24, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  badge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    color: '#14532D',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  meta: { color: '#6B7280', fontSize: 13 },
  desc: { color: '#374151', lineHeight: 22, marginTop: 12 },
  ingredients: { color: '#6B7280', fontSize: 13, marginTop: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontWeight: '700', color: '#14532D', marginBottom: 8 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    minWidth: 90,
  },
  variantActive: { borderColor: '#14532D', backgroundColor: '#F0FDF4' },
  variantName: { fontWeight: '600', fontSize: 13 },
  variantPrice: { color: '#14532D', fontWeight: '700', marginTop: 2 },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  qtySection: { marginTop: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontWeight: '800', fontSize: 18 },
  price: { color: '#14532D', fontSize: 22, fontWeight: '800', marginTop: 16 },
  footer: {
    backgroundColor: '#fff',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: 16,
    position: 'absolute',
    right: 0,
  },
  addBtn: { alignItems: 'center', borderRadius: 14, paddingVertical: 14 },
  addText: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
});
