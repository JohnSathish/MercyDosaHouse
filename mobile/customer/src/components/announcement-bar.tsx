import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { liveChargesBannerMessage } from '@mdh/utils';
import type { MarketingAnnouncementDto } from '@mdh/types';
import { isHomeDeliveryActive } from '@mdh/types';
import { WEBSITE_URL } from '@/lib/constants';
import { MarkdownNotice, SectionHeader } from '@/ui';
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
  const charges = liveChargesBannerMessage({
    packingCharge: config.delivery.packingCharge ?? 20,
    deliveryCharge: config.delivery.deliveryCharge,
    freeDeliveryLimit: config.delivery.freeDeliveryLimit ?? 299,
  });
  const message = item ? (item.icon ? `${item.icon} ${item.message}` : item.message) : charges;

  return (
    <View style={styles.bar}>
      <Text style={styles.barText} numberOfLines={1}>
        {message}
      </Text>
      <Text style={styles.barArrow}>›</Text>
    </View>
  );
}

/** Expandable home-delivery card — Admin marketing delivery config. */
export function HomeDeliverySection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const delivery = config.marketing?.delivery;
  const card = config.marketing?.byPlacement?.DELIVERY_CARD?.[0];

  if (!delivery && !card) return null;

  const deliveryActive = isHomeDeliveryActive(delivery);
  const areaList = delivery?.areas?.length
    ? [...new Set(delivery.areas.map((a) => a.trim()).filter(Boolean))]
    : card?.shortMessage
      ? [card.shortMessage]
      : [];
  const primaryMessage =
    delivery?.message?.trim() ||
    card?.message?.trim() ||
    (deliveryActive
      ? areaList.join(' & ')
      : 'Pickup orders only — home delivery is not available.');
  const orderWindow = deliveryActive ? delivery?.orderWindow : null;
  const deliveryWindow = deliveryActive ? delivery?.deliveryWindow : null;
  const detail = delivery?.expansionMessage ?? null;
  const looksLikeMarkdown =
    (primaryMessage?.includes('**') ?? false) || (primaryMessage?.length ?? 0) > 90;
  const noticeBody = detail || (looksLikeMarkdown ? primaryMessage : null);
  const subtitle = areaList.length
    ? areaList.join(' · ')
    : looksLikeMarkdown
      ? deliveryActive
        ? 'Available in selected areas'
        : 'Pickup only'
      : primaryMessage;

  return (
    <Pressable
      style={styles.deliveryWrap}
      onPress={() => setExpanded((v) => !v)}
      accessibilityRole="button"
    >
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryTop}>
          <View style={styles.deliveryIconWrap}>
            <Text style={styles.deliveryEmoji}>{card?.icon ?? (deliveryActive ? '🛵' : '🥡')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deliveryTitle, { color: colors.primary }]}>
              {card?.title ?? 'Home Delivery'}
            </Text>
            {subtitle ? (
              <Text style={styles.deliveryAreas} numberOfLines={expanded ? 3 : 2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.chevronWrap}>
            <Text style={[styles.chevron, { color: colors.primary }]}>{expanded ? '▴' : '▾'}</Text>
          </View>
        </View>

        {(orderWindow || deliveryWindow) && (
          <View style={styles.windowRow}>
            {orderWindow ? (
              <View style={styles.windowChip}>
                <Text style={styles.windowChipLabel}>Order</Text>
                <Text style={styles.windowChipValue}>{orderWindow}</Text>
              </View>
            ) : null}
            {deliveryWindow ? (
              <View style={styles.windowChip}>
                <Text style={styles.windowChipLabel}>Delivery</Text>
                <Text style={styles.windowChipValue}>{deliveryWindow}</Text>
              </View>
            ) : null}
          </View>
        )}

        {expanded && noticeBody ? (
          <View style={styles.noticeBox}>
            <MarkdownNotice text={noticeBody} />
          </View>
        ) : (
          <Text style={[styles.viewDetails, { color: colors.primary }]}>
            {expanded ? 'Hide details' : 'View delivery notice'}
          </Text>
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
  deliveryWrap: { paddingHorizontal: 14, paddingTop: 10 },
  deliveryCard: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.08)',
  },
  deliveryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  deliveryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryEmoji: { fontSize: 18 },
  deliveryTitle: { fontSize: 15, fontWeight: '800' },
  deliveryAreas: { color: COLORS.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { fontSize: 12, fontWeight: '800' },
  windowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  windowChip: {
    flexGrow: 1,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '42%',
  },
  windowChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  windowChipValue: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  noticeBox: {
    marginTop: 12,
    backgroundColor: '#FFFBF3',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewDetails: { fontSize: 12.5, fontWeight: '800', marginTop: 10 },
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
