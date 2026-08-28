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
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 8), backgroundColor: colors.primary },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoEmoji}>🥘</Text>
            </View>
          )}
          <View style={styles.brandText}>
            <Text style={styles.appName} numberOfLines={1}>
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.icon}>👤</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={styles.searchFake} onPress={() => router.push('/search')}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Search dosa, idli, biryani…</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { flex: 1, minWidth: 0 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 18 },
  appName: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 3 },
  locationPin: { fontSize: 11 },
  location: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: 'rgba(254,243,199,0.95)' },
  chevron: { fontSize: 11, color: '#FDE68A' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 15 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#1F2937' },
  searchFake: {
    ...SHADOW.card,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchPlaceholder: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
});
