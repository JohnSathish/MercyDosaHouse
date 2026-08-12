import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { useCartStore } from '@/stores/cart-store';
import { WEBSITE_URL } from '@/lib/constants';
import { COLORS, RADIUS, SHADOW, resolveAssetUrl } from './theme';

export function AppHeader({ locationLabel = 'Select location' }: { locationLabel?: string }) {
  const config = useAppConfig();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());
  const logoUri = resolveAssetUrl(
    config.branding.logoUrl ?? config.branding.appIconUrl,
    WEBSITE_URL,
  );

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={[styles.logo, styles.logoFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoEmoji}>🥘</Text>
            </View>
          )}
          <View style={styles.brandText}>
            <Text style={[styles.appName, { color: colors.primary }]} numberOfLines={1}>
              {config.branding.appName}
            </Text>
            <Pressable
              style={styles.locationRow}
              onPress={() => router.push('/addresses')}
              hitSlop={6}
            >
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.location} numberOfLines={1}>
                {locationLabel}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
            <Text style={styles.icon}>🔔</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/cart')}>
            <Text style={styles.icon}>🛒</Text>
            {cartCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.icon}>👤</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { flex: 1, minWidth: 0 },
  logo: { width: 36, height: 36, borderRadius: 18 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 18 },
  appName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1, gap: 2 },
  locationPin: { fontSize: 10 },
  location: { flexShrink: 1, fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  chevron: { fontSize: 10, color: COLORS.textMuted, marginLeft: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  icon: { fontSize: 15 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
