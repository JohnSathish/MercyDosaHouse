import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '@/stores/cart-store';
import { FavoriteButton } from './favorite-button';

interface ProductRowProps {
  product: {
    id: string;
    name: string;
    price: number;
    packingCharge?: number;
    prepTimeMinutes?: number;
    foodType?: string;
  };
  showFavorite?: boolean;
}

export function ProductRow({ product, showFavorite }: ProductRowProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <Pressable style={styles.row} onPress={() => router.push(`/product/${product.id}`)}>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{product.name}</Text>
          {showFavorite ? <FavoriteButton productId={product.id} size={18} /> : null}
        </View>
        {product.foodType ? (
          <Text style={styles.foodType}>
            {product.foodType === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
          </Text>
        ) : null}
        {product.prepTimeMinutes ? (
          <Text style={styles.meta}>⏱ {product.prepTimeMinutes} min</Text>
        ) : null}
        <Text style={styles.price}>₹{product.price}</Text>
      </View>
      <Pressable
        style={styles.addBtn}
        onPress={() => {
          addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            packingCharge: product.packingCharge ?? 20,
          });
        }}
      >
        <Text style={styles.addText}>Add</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  foodType: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  meta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  price: { color: '#14532D', fontWeight: '700', marginTop: 4 },
  addBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: '#1F2937', fontWeight: '700', fontSize: 13 },
});
