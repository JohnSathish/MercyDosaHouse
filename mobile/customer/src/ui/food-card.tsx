import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';
import { WEBSITE_URL } from '@/lib/constants';
import { FavoriteButton } from '@/components/favorite-button';
import { Badge } from './badge';
import { COLORS, RADIUS, SHADOW, resolveAssetUrl } from './theme';

export interface FoodCardProduct {
  id: string;
  name: string;
  price: number;
  packingCharge?: number;
  prepTimeMinutes?: number;
  foodType?: string;
  description?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  isBestseller?: boolean;
  isPopular?: boolean;
}

export function FoodCard({
  product,
  showFavorite,
  layout = 'row',
}: {
  product: FoodCardProduct;
  showFavorite?: boolean;
  layout?: 'row' | 'horizontal';
}) {
  const colors = useThemeColors();
  const addItem = useCartStore((s) => s.addItem);
  const imageUri = resolveAssetUrl(product.imageUrl, WEBSITE_URL);
  const isVeg = product.foodType === 'VEG';
  const isNonVeg = product.foodType === 'NON_VEG';

  if (layout === 'horizontal') {
    return (
      <Pressable style={styles.hCard} onPress={() => router.push(`/product/${product.id}`)}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.hImage} resizeMode="cover" />
        ) : (
          <View style={[styles.hImage, styles.imageFallback]}>
            <Text style={styles.fallbackEmoji}>🥘</Text>
          </View>
        )}
        <View style={styles.hBody}>
          {(product.isBestseller || product.isPopular) && (
            <Badge label="Bestseller" tone="danger" />
          )}
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.meta}>
            ⭐ {(product.rating ?? 4.8).toFixed(1)}
            {product.prepTimeMinutes ? ` · ${product.prepTimeMinutes} min` : ''}
          </Text>
          <View style={styles.hFooter}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(product.price)}
            </Text>
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  packingCharge: product.packingCharge ?? 20,
                  imageUrl: product.imageUrl,
                })
              }
            >
              <Text style={styles.addText}>+ Add</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.row} onPress={() => router.push(`/product/${product.id}`)}>
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.fallbackEmoji}>🥘</Text>
          </View>
        )}
        {isVeg || isNonVeg ? (
          <View style={[styles.vegDot, { borderColor: isVeg ? '#16A34A' : '#DC2626' }]}>
            <View style={[styles.vegInner, { backgroundColor: isVeg ? '#16A34A' : '#DC2626' }]} />
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            {(product.isBestseller || product.isPopular) && (
              <View style={{ marginBottom: 4 }}>
                <Badge label="Bestseller" tone="danger" />
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
          </View>
          {showFavorite ? <FavoriteButton productId={product.id} size={18} /> : null}
        </View>
        {product.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          ⭐ {(product.rating ?? 4.8).toFixed(1)}
          {product.prepTimeMinutes ? ` · ${product.prepTimeMinutes} min` : ''}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {formatCurrency(product.price)}
          </Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.secondary }]}
            onPress={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                packingCharge: product.packingCharge ?? 20,
                imageUrl: product.imageUrl,
              })
            }
          >
            <Text style={styles.addTextDark}>+ Add</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
    gap: 12,
  },
  imageWrap: { position: 'relative' },
  image: { width: 92, height: 92, borderRadius: RADIUS.md },
  imageFallback: {
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 28 },
  vegDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegInner: { width: 6, height: 6, borderRadius: 3 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  desc: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontWeight: '800', fontSize: 15 },
  addBtn: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  addTextDark: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  hCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    width: 168,
    marginRight: 12,
    overflow: 'hidden',
  },
  hImage: { width: '100%', height: 110 },
  hBody: { padding: 10 },
  hFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
