import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@mdh/utils';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';
import { RADIUS, SHADOW } from './theme';

/** Floating cart summary above the tab bar (hidden on Cart — checkout CTA lives there). */
export function FloatingCartBar() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const count = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  const onCartScreen =
    pathname === '/cart' || pathname.endsWith('/cart') || pathname.includes('(tabs)/cart');

  if (!items.length || onCartScreen) return null;

  // Tab bar ~62 + safe area; sit just above it
  const bottom = 62 + Math.max(insets.bottom, 0) + 8;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        style={[styles.bar, { backgroundColor: colors.primary }, SHADOW.float]}
        onPress={() => router.push('/(tabs)/cart')}
      >
        <View>
          <Text style={styles.count}>
            {count} {count === 1 ? 'Item' : 'Items'} · {formatCurrency(subtotal)}
          </Text>
        </View>
        <Text style={styles.cta}>View Cart →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
  },
  bar: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cta: { color: '#FDE68A', fontWeight: '800', fontSize: 14 },
});
