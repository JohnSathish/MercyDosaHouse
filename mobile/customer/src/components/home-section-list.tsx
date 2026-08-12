import type { MobileHomeSectionDto, CheckoutProfileDto } from '@mdh/types';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth-storage';
import { WEBSITE_URL } from '@/lib/constants';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import {
  AnnouncementBar,
  HomeDeliverySection,
  PreOrderComingSoonSection,
} from './announcement-bar';
import {
  CategoryChip,
  FoodCard,
  FoodCardSkeleton,
  SearchBar,
  SectionHeader,
  StoreStatusCard,
  type FoodCardProduct,
} from '@/ui';
import { COLORS, RADIUS, SHADOW, resolveAssetUrl } from '@/ui/theme';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

function ChargeHintStrip() {
  const config = useAppConfig();
  const d = config.delivery;
  const freeMsg = d.freeDeliveryLimit > 0 ? ` · Free delivery above ₹${d.freeDeliveryLimit}` : '';
  return (
    <View style={styles.chargeStrip}>
      <Text style={styles.chargeText}>
        Delivery ₹{d.deliveryCharge} · Packing from ₹{d.packingCharge}
        {freeMsg}
      </Text>
    </View>
  );
}

function InlineHomeSearch() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['home-search', query],
    queryFn: () => {
      const params = new URLSearchParams({ available: 'true', limit: '12' });
      params.set('search', query.trim());
      return api.list<FoodCardProduct>(`/products?${params.toString()}`);
    },
    enabled: query.trim().length >= 2,
  });

  const products = data?.data ?? [];
  const suggestions = ['Dosa', 'Idli', 'Biryani', 'Chicken Curry Dosa', 'Vada'];

  return (
    <View style={styles.searchBlock}>
      <SearchBar value={query} onChangeText={setQuery} />
      {query.trim().length >= 2 ? (
        <View style={styles.searchResults}>
          <Text style={[styles.searchLabel, { color: colors.primary }]}>Top Results</Text>
          {isFetching && !products.length ? (
            <FoodCardSkeleton />
          ) : products.length ? (
            products.slice(0, 5).map((p) => <FoodCard key={p.id} product={p} />)
          ) : (
            <Text style={styles.empty}>No matches for “{query}”</Text>
          )}
          <Pressable onPress={() => router.push({ pathname: '/search', params: { q: query } })}>
            <Text style={[styles.seeAll, { color: colors.secondary }]}>See all results →</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestRow}>
          {suggestions.map((s) => (
            <Pressable key={s} style={styles.suggestChip} onPress={() => setQuery(s)}>
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CategoriesSection() {
  const colors = useThemeColors();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () => api.get<Category[]>('/categories?active=true&channel=mobile'),
  });

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Explore Categories"
        actionLabel="Menu"
        onAction={() => router.push('/(tabs)/menu')}
      />
      {isLoading ? (
        <FoodCardSkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <CategoryChip icon="🍽️" label="All" onPress={() => router.push('/(tabs)/menu')} />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              icon={cat.icon}
              label={cat.name}
              onPress={() =>
                router.push({ pathname: '/(tabs)/menu', params: { categoryId: cat.id } })
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ProductsCarousel({
  title,
  query,
  emoji,
}: {
  title: string;
  query: string;
  emoji?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'carousel', query],
    queryFn: () => api.list<FoodCardProduct>(`/products?available=true&${query}`),
  });
  const products = data?.data ?? [];

  if (!isLoading && !products.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={`${emoji ? `${emoji} ` : ''}${title}`}
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/menu')}
      />
      {isLoading ? (
        <ScrollView horizontal>
          <FoodCardSkeleton />
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {products.slice(0, 8).map((p) => (
            <FoodCard key={p.id} product={p} layout="horizontal" />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ProductsListSection({ title, query }: { title: string; query: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'list', query, title],
    queryFn: () => api.list<FoodCardProduct>(`/products?available=true&${query}`),
  });
  const products = data?.data ?? [];

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {isLoading ? (
        <>
          <FoodCardSkeleton />
          <FoodCardSkeleton />
        </>
      ) : products.length ? (
        products.slice(0, 6).map((p) => <FoodCard key={p.id} product={p} showFavorite />)
      ) : (
        <Text style={styles.empty}>No items yet.</Text>
      )}
    </View>
  );
}

function OffersSection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const offers =
    config.offers?.filter((o) => (o as { isActive?: boolean }).isActive !== false) ?? [];
  const banners = config.banners.filter((b) => b.isActive);

  if (!offers.length && !banners.length) {
    // Still show delivery-based promo from config
    if (config.delivery.freeDeliveryLimit > 0) {
      return (
        <View style={styles.section}>
          <SectionHeader title="🎁 Offers For You" />
          <View style={[styles.offerCard, { borderColor: colors.secondary }]}>
            <Text style={[styles.offerTitle, { color: colors.primary }]}>Free Delivery</Text>
            <Text style={styles.offerBody}>
              On orders above ₹{config.delivery.freeDeliveryLimit}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="🎁 Offers For You" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {banners.map((b) => (
          <View key={b.id} style={[styles.offerCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.offerTitleLight}>{b.title}</Text>
            {b.subtitle ? <Text style={styles.offerBodyLight}>{b.subtitle}</Text> : null}
          </View>
        ))}
        {offers.map((o) => (
          <View key={o.id} style={[styles.offerCard, { borderColor: colors.secondary }]}>
            <Text style={[styles.offerTitle, { color: colors.primary }]}>{o.title}</Text>
            {o.description ? <Text style={styles.offerBody}>{o.description}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function HeroSection({ section }: { section: MobileHomeSectionDto }) {
  const colors = useThemeColors();
  const config = useAppConfig();
  const content = section.content as {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    ctaText?: string;
    price?: number;
  };
  const imageUri = resolveAssetUrl(content.imageUrl, WEBSITE_URL);
  const heroPromo = config.marketing?.byPlacement?.HERO_SECTION?.[0];
  const promoImage = resolveAssetUrl(
    heroPromo?.heroBannerImageUrl ?? heroPromo?.bannerImageUrl,
    WEBSITE_URL,
  );

  return (
    <View style={styles.heroWrap}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        {(imageUri || promoImage) && (
          <Image
            source={{ uri: imageUri || promoImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroEyebrow}>Today&apos;s Special</Text>
          <Text style={styles.heroTitle}>
            {content.title ?? heroPromo?.title ?? config.branding.appName}
          </Text>
          <Text style={styles.heroSub}>
            {content.subtitle ?? heroPromo?.shortMessage ?? config.branding.tagline}
          </Text>
          {content.price != null ? (
            <Text style={styles.heroPrice}>{formatCurrency(content.price)}</Text>
          ) : null}
          <Pressable
            style={[styles.heroCta, { backgroundColor: colors.secondary }]}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.heroCtaText}>{content.ctaText ?? 'Order Now'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RecentlyOrderedSection() {
  const colors = useThemeColors();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    void isAuthenticated().then(setAuthed);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['checkout-profile'],
    queryFn: () => api.get<CheckoutProfileDto>('/users/me/checkout-profile'),
    enabled: authed,
  });

  return (
    <View style={styles.section}>
      <SectionHeader title="Recently Ordered" />
      {!authed ? (
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.empty}>Sign in to see your recent orders →</Text>
        </Pressable>
      ) : profile?.recentOrders?.length ? (
        profile.recentOrders.slice(0, 3).map((o) => (
          <Pressable
            key={o.id}
            style={styles.recentCard}
            onPress={() => router.push(`/track/${encodeURIComponent(o.orderNumber)}`)}
          >
            <Text style={[styles.recentNum, { color: colors.primary }]}>#{o.orderNumber}</Text>
            <Text style={styles.recentMeta}>{o.deliveryAddress}</Text>
            <Text style={styles.recentTotal}>₹{o.grandTotal}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>No recent orders yet.</Text>
      )}
    </View>
  );
}

function renderSection(section: MobileHomeSectionDto) {
  switch (section.sectionKey) {
    case 'hero_banner':
      return <HeroSection key={section.id} section={section} />;
    case 'categories':
      return <CategoriesSection key={section.id} />;
    case 'popular_items':
      return (
        <ProductsCarousel
          key={section.id}
          title="Popular Near You"
          query="popular=true"
          emoji="🔥"
        />
      );
    case 'best_sellers':
      return (
        <ProductsCarousel
          key={section.id}
          title={section.title ?? 'Bestsellers'}
          query="popular=true"
          emoji="⭐"
        />
      );
    case 'featured_items':
    case 'recommended_items':
    case 'new_arrivals':
    case 'combos':
    case 'festival_specials':
    case 'todays_offers':
      return (
        <ProductsListSection
          key={section.id}
          title={section.title ?? section.sectionKey.replace(/_/g, ' ')}
          query="limit=8"
        />
      );
    case 'promotional_banners':
      return <OffersSection key={section.id} />;
    case 'recently_ordered':
      return <RecentlyOrderedSection key={section.id} />;
    default:
      return null;
  }
}

export function HomeSectionList() {
  const config = useAppConfig();
  const sections = useMemo(() => config.homepage.filter((s) => s.isEnabled), [config.homepage]);

  const hasHero = sections.some((s) => s.sectionKey === 'hero_banner');
  const hasCategories = sections.some((s) => s.sectionKey === 'categories');
  const hasOffers = sections.some((s) => s.sectionKey === 'promotional_banners');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AnnouncementBar />
      <StoreStatusCard />
      <HomeDeliverySection />
      {!hasHero ? (
        <HeroSection
          section={{
            id: 'fallback-hero',
            sectionKey: 'hero_banner',
            content: {},
            sortOrder: 0,
            isEnabled: true,
            status: 'PUBLISHED',
          }}
        />
      ) : null}
      {sections.map((section) => renderSection(section))}
      {!hasCategories ? <CategoriesSection /> : null}
      <InlineHomeSearch />
      {!hasOffers ? <OffersSection /> : null}
      <PreOrderComingSoonSection />
      <ChargeHintStrip />
      <View style={{ height: 88 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 24 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  empty: { color: COLORS.textMuted, fontSize: 14 },
  chargeStrip: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.amberSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chargeText: { color: '#92400E', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  searchBlock: { paddingHorizontal: 16, paddingTop: 16 },
  searchResults: { marginTop: 12 },
  searchLabel: { fontWeight: '800', fontSize: 14, marginBottom: 8 },
  seeAll: { fontWeight: '700', marginTop: 8, textAlign: 'center' },
  suggestRow: { marginTop: 10 },
  suggestChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  suggestText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  heroWrap: { paddingHorizontal: 16, paddingTop: 12 },
  hero: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    minHeight: 168,
    ...SHADOW.card,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  heroOverlay: { padding: 18 },
  heroEyebrow: { color: '#FDE68A', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.88)', marginTop: 4, fontSize: 13 },
  heroPrice: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 8 },
  heroCta: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.md,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroCtaText: { color: COLORS.text, fontWeight: '800' },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginRight: 10,
    minWidth: 200,
  },
  offerTitle: { fontWeight: '800', fontSize: 15 },
  offerBody: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  offerTitleLight: { color: '#fff', fontWeight: '800', fontSize: 15 },
  offerBodyLight: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  recentNum: { fontWeight: '700', fontFamily: 'monospace' },
  recentMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  recentTotal: { fontWeight: '700', marginTop: 4 },
});
