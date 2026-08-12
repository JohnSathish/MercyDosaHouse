import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import type { MarketingAnnouncementDto } from '@mdh/types';
import { WEBSITE_URL } from '@/lib/constants';
import { SectionHeader } from '@/ui';
import { COLORS, RADIUS, SHADOW, resolveAssetUrl } from '@/ui/theme';

function topBarAnnouncement(
  config: ReturnType<typeof useAppConfig>,
): MarketingAnnouncementDto | undefined {
  const fromPlacement = config.marketing?.byPlacement?.TOP_BAR?.[0];
  if (fromPlacement) return fromPlacement;
  const bar = config.announcements.find((a) => a.type === 'BAR');
  return bar as MarketingAnnouncementDto | undefined;
}

export function AnnouncementBar() {
  const config = useAppConfig();
  const item = topBarAnnouncement(config);
  const message = item ? (item.icon ? `${item.icon} ${item.message}` : item.message) : null;
  if (!message) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.barText} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

/** Compact home-delivery card — Admin marketing delivery config. */
export function HomeDeliverySection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const delivery = config.marketing?.delivery;
  const card = config.marketing?.byPlacement?.DELIVERY_CARD?.[0];

  if (!delivery && !card) return null;

  const areas = delivery?.areas?.length
    ? [...new Set(delivery.areas.map((a) => a.trim()).filter(Boolean))].join(' & ')
    : card?.shortMessage;

  return (
    <View style={styles.deliveryWrap}>
      <View style={styles.deliveryCard}>
        <Text style={[styles.deliveryTitle, { color: colors.primary }]}>
          {card?.icon ?? '🚚'} {card?.title ?? 'Home Delivery'}
        </Text>
        {areas ? (
          <Text style={styles.deliveryBody}>
            Currently available in{' '}
            <Text style={[styles.deliveryBold, { color: colors.primary }]}>{areas}</Text>
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {delivery?.orderWindow ? (
            <Text style={styles.deliveryMeta}>Order: {delivery.orderWindow}</Text>
          ) : null}
          {delivery?.deliveryWindow ? (
            <Text style={styles.deliveryMeta}>Delivery: {delivery.deliveryWindow}</Text>
          ) : null}
        </View>
        {(delivery?.expansionMessage ?? card?.message ?? delivery?.message) ? (
          <Text style={[styles.deliveryFooter, { color: colors.secondary }]}>
            {delivery?.expansionMessage ?? card?.message ?? delivery?.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Horizontal coming-soon / pre-order carousel. */
export function PreOrderComingSoonSection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const promos = (
    config.marketing?.byPlacement?.HERO_SECTION ??
    config.marketing?.announcements ??
    []
  ).filter((a) => (a.bannerImageUrl || a.heroBannerImageUrl) && a.isActive);

  if (!promos.length) return null;

  return (
    <View style={styles.preOrderWrap}>
      <SectionHeader title="🔥 Coming Soon" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.preOrderRow}
      >
        {promos.map((promo) => {
          const imageUrl = resolveAssetUrl(
            promo.heroBannerImageUrl ?? promo.bannerImageUrl,
            WEBSITE_URL,
          );
          const isComingSoon = /coming soon/i.test(promo.title);
          return (
            <View key={promo.id} style={styles.promoCard}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.promoImage} resizeMode="cover" />
              ) : (
                <View style={[styles.promoImage, styles.promoFallback]}>
                  <Text style={{ fontSize: 36 }}>🥘</Text>
                </View>
              )}
              <View style={styles.promoBody}>
                <Text style={[styles.promoBadge, { backgroundColor: colors.secondary }]}>
                  {isComingSoon ? 'Coming Soon' : 'Pre-Order'}
                </Text>
                <Text style={[styles.promoTitle, { color: colors.primary }]} numberOfLines={2}>
                  {promo.icon ? `${promo.icon} ` : ''}
                  {promo.title}
                </Text>
                {promo.shortMessage ? (
                  <Text style={styles.promoPrice}>{promo.shortMessage}</Text>
                ) : null}
                {(promo.ctaUrl || promo.linkUrl) && (
                  <Pressable
                    style={[styles.promoBtn, { backgroundColor: colors.primary }]}
                    onPress={() =>
                      router.push((promo.ctaUrl ?? promo.linkUrl ?? '/(tabs)/menu') as never)
                    }
                  >
                    <Text style={styles.promoBtnText}>{promo.ctaText ?? 'Pre-Order'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** @deprecated */
export function DeliveryInfoCard() {
  return (
    <>
      <HomeDeliverySection />
      <PreOrderComingSoonSection />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  barText: { color: '#FDE68A', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  deliveryWrap: { paddingHorizontal: 16, paddingTop: 10 },
  deliveryCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.1)',
  },
  deliveryTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  deliveryBody: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  deliveryBold: { fontWeight: '700' },
  metaRow: { marginTop: 6, gap: 2 },
  deliveryMeta: { color: COLORS.textMuted, fontSize: 12 },
  deliveryFooter: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  preOrderWrap: { paddingTop: 8, paddingHorizontal: 16 },
  preOrderRow: { gap: 12, paddingRight: 8 },
  promoCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    width: 200,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promoImage: { width: '100%', height: 100 },
  promoFallback: {
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBody: { padding: 10 },
  promoBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: 6,
    color: COLORS.text,
  },
  promoTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  promoPrice: { color: COLORS.secondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  promoBtn: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.sm,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  promoBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
