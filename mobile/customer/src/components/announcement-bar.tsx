import { useState } from 'react';
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
      <Text style={styles.barText} numberOfLines={1}>
        {message}
      </Text>
      <Text style={styles.barArrow}>›</Text>
    </View>
  );
}

/** Compact expandable home-delivery card — Admin marketing delivery config. */
export function HomeDeliverySection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const delivery = config.marketing?.delivery;
  const card = config.marketing?.byPlacement?.DELIVERY_CARD?.[0];

  if (!delivery && !card) return null;

  const status = delivery?.status ?? 'LIMITED_AREA';
  const deliveryActive = status === 'AVAILABLE' || status === 'LIMITED_AREA';
  const areas = delivery?.areas?.length
    ? [...new Set(delivery.areas.map((a) => a.trim()).filter(Boolean))].join(' & ')
    : card?.shortMessage;
  const primaryMessage =
    delivery?.message?.trim() ||
    card?.message?.trim() ||
    (deliveryActive ? areas : 'Pickup Orders Only — Home Delivery Is Not Available.');
  const orderWindow = deliveryActive ? delivery?.orderWindow : null;
  const deliveryWindow = deliveryActive ? delivery?.deliveryWindow : null;
  const detail = delivery?.expansionMessage ?? null;

  return (
    <Pressable
      style={styles.deliveryWrap}
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
    >
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryTop}>
          <Text style={styles.deliveryEmoji}>{card?.icon ?? (deliveryActive ? '🛵' : '🥡')}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deliveryTitle, { color: colors.primary }]}>
              {card?.title ?? 'Home Delivery'}
            </Text>
            {primaryMessage ? (
              <Text style={styles.deliveryAreas} numberOfLines={expanded ? 4 : 2}>
                {primaryMessage}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.chevron, { color: colors.secondary }]}>{expanded ? '▴' : '▾'}</Text>
        </View>

        {(orderWindow || deliveryWindow) && (
          <Text style={styles.windows} numberOfLines={expanded ? 2 : 1}>
            {[
              orderWindow ? `Order: ${orderWindow}` : null,
              deliveryWindow ? `Delivery: ${deliveryWindow}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}

        {expanded && detail ? (
          <Text style={[styles.deliveryFooter, { color: colors.secondary }]}>{detail}</Text>
        ) : (
          <Text style={[styles.viewDetails, { color: colors.secondary }]}>View details →</Text>
        )}
      </View>
    </Pressable>
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barText: { flex: 1, color: '#FDE68A', fontSize: 11.5, fontWeight: '600' },
  barArrow: { color: '#FDE68A', fontSize: 16, fontWeight: '700' },
  deliveryWrap: { paddingHorizontal: 14, paddingTop: 8 },
  deliveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.1)',
  },
  deliveryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  deliveryEmoji: { fontSize: 16, marginTop: 1 },
  deliveryTitle: { fontSize: 13, fontWeight: '800' },
  deliveryAreas: { color: COLORS.textMuted, fontSize: 12, marginTop: 1, lineHeight: 16 },
  chevron: { fontSize: 12, fontWeight: '700', paddingTop: 2 },
  windows: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 6, marginLeft: 24 },
  viewDetails: { fontSize: 11.5, fontWeight: '700', marginTop: 6, marginLeft: 24 },
  deliveryFooter: { fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 24, lineHeight: 16 },
  preOrderWrap: { paddingTop: 8, paddingHorizontal: 14 },
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
