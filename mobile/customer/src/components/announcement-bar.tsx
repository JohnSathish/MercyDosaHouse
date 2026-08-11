import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppConfig } from '@/providers/config-context';
import type { MarketingAnnouncementDto } from '@mdh/types';
import { WEBSITE_URL } from '@/lib/constants';

function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${WEBSITE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

function topBarAnnouncement(
  config: ReturnType<typeof useAppConfig>,
): MarketingAnnouncementDto | undefined {
  const marketing = config.marketing;
  const fromPlacement = marketing?.byPlacement?.TOP_BAR?.[0];
  if (fromPlacement) return fromPlacement;
  return config.announcements.find((a) => a.type === 'BAR');
}

export function AnnouncementBar() {
  const config = useAppConfig();
  const item = topBarAnnouncement(config);
  const message = item ? (item.icon ? `${item.icon} ${item.message}` : item.message) : null;

  if (!message) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

/** Compact home-delivery card below hero — driven by marketing delivery config. */
export function HomeDeliverySection() {
  const config = useAppConfig();
  const delivery = config.marketing?.delivery;
  const card = config.marketing?.byPlacement?.DELIVERY_CARD?.[0];

  if (!delivery && !card) return null;

  const areas = delivery?.areas?.length ? delivery.areas.join(' & ') : card?.shortMessage;

  return (
    <View style={styles.deliveryWrap}>
      <View style={styles.deliveryCard}>
        <Text style={styles.deliveryTitle}>
          {card?.icon ?? '🏠'} {card?.title ?? 'Home Delivery'}
        </Text>
        {areas ? (
          <Text style={styles.deliveryBody}>
            Currently available in{'\n'}
            <Text style={styles.deliveryBold}>{areas}</Text>
          </Text>
        ) : null}
        {delivery?.orderWindow ? (
          <Text style={styles.deliveryMeta}>Order: {delivery.orderWindow}</Text>
        ) : null}
        {delivery?.deliveryWindow ? (
          <Text style={styles.deliveryMeta}>Delivery: {delivery.deliveryWindow}</Text>
        ) : null}
        <Text style={styles.deliveryFooter}>
          {delivery?.expansionMessage ?? card?.message ?? delivery?.message}
        </Text>
      </View>
    </View>
  );
}

/** Pre-order / coming-soon cards — HERO_SECTION placement with banner images. */
export function PreOrderComingSoonSection() {
  const config = useAppConfig();
  const promos = (
    config.marketing?.byPlacement?.HERO_SECTION ??
    config.marketing?.announcements ??
    []
  ).filter((a) => (a.bannerImageUrl || a.heroBannerImageUrl) && a.isActive);

  if (!promos.length) return null;

  return (
    <View style={styles.preOrderWrap}>
      <Text style={styles.preOrderHeading}>🔥 Coming Soon & Pre-Order</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.preOrderRow}
      >
        {promos.map((promo) => {
          const imageUrl = resolveImageUrl(promo.heroBannerImageUrl ?? promo.bannerImageUrl);
          const isComingSoon = /coming soon/i.test(promo.title);
          return (
            <View key={promo.id} style={styles.promoCard}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.promoImage} resizeMode="cover" />
              ) : null}
              <View style={styles.promoBody}>
                <Text style={styles.promoBadge}>{isComingSoon ? 'Coming Soon' : 'Pre-Order'}</Text>
                <Text style={styles.promoTitle} numberOfLines={2}>
                  {promo.icon ? `${promo.icon} ` : ''}
                  {promo.title}
                </Text>
                {promo.shortMessage ? (
                  <Text style={styles.promoPrice}>{promo.shortMessage}</Text>
                ) : null}
                <Text style={styles.promoDesc} numberOfLines={3}>
                  {promo.message}
                </Text>
                {(promo.ctaUrl || promo.linkUrl) && (
                  <Pressable
                    style={styles.promoBtn}
                    onPress={() =>
                      router.push((promo.ctaUrl ?? promo.linkUrl ?? '/checkout') as never)
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

/** @deprecated Use HomeDeliverySection + PreOrderComingSoonSection */
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
    backgroundColor: '#14532D',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: { color: '#FDE68A', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  deliveryWrap: { paddingHorizontal: 16, paddingTop: 12 },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deliveryTitle: {
    color: '#14532D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  deliveryBody: { color: '#374151', fontSize: 14, lineHeight: 20 },
  deliveryBold: { color: '#14532D', fontWeight: '700' },
  deliveryMeta: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  deliveryFooter: { color: '#F59E0B', fontSize: 13, fontWeight: '600', marginTop: 10 },
  preOrderWrap: { paddingTop: 16, paddingBottom: 4 },
  preOrderHeading: {
    color: '#14532D',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  preOrderRow: { paddingHorizontal: 16, gap: 12 },
  promoCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 83, 45, 0.1)',
    width: 260,
    overflow: 'hidden',
  },
  promoImage: { width: '100%', height: 120 },
  promoBody: { padding: 12 },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    color: '#1F2937',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 6,
  },
  promoTitle: { color: '#14532D', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  promoPrice: { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  promoDesc: { color: '#6B7280', fontSize: 12, lineHeight: 17 },
  promoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#14532D',
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  promoBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
