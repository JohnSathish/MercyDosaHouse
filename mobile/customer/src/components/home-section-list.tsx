import type { MobileHomeSectionDto, CheckoutProfileDto } from '@mdh/types';
import { allocateHomeCatalog, productHomeBadge } from '@mdh/utils';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '@mdh/utils';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth-storage';
import { WEBSITE_URL } from '@/lib/constants';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { AnnouncementBar, HomeDeliverySection } from './announcement-bar';
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

type CatalogProduct = FoodCardProduct & {
  isFeatured?: boolean;
  isBestseller?: boolean;
  isOnOffer?: boolean;
  isPreOrder?: boolean;
  isComingSoon?: boolean;
};

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
  const suggestions = ['Dosa', 'Idli', 'Biryani', 'Vada'];

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
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () => api.get<Category[]>('/categories?active=true&channel=mobile'),
  });

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Explore Categories"
        actionLabel="Full menu"
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

function ProductCarouselBlock({
  title,
  products,
  emoji,
}: {
  title: string;
  products: CatalogProduct[];
  emoji?: string;
}) {
  if (!products.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title={`${emoji ? `${emoji} ` : ''}${title}`}
        actionLabel="Full menu"
        onAction={() => router.push('/(tabs)/menu')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {products.map((p) => (
          <FoodCard
            key={p.id}
            product={{
              ...p,
              isPopular: p.isPopular || p.isBestseller,
              isBestseller: p.isBestseller,
            }}
            layout="horizontal"
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ProductListBlock({
  title,
  products,
  subtitle,
}: {
  title: string;
  products: CatalogProduct[];
  subtitle?: string;
}) {
  if (!products.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title={title}
        actionLabel="Full menu"
        onAction={() => router.push('/(tabs)/menu')}
      />
      {subtitle ? <Text style={styles.sectionHint}>{subtitle}</Text> : null}
      {products.map((p) => (
        <FoodCard
          key={p.id}
          product={{
            ...p,
            isPopular: p.isPopular || p.isBestseller,
            isBestseller: p.isBestseller,
          }}
          showFavorite
        />
      ))}
      <Pressable style={styles.fullMenuCta} onPress={() => router.push('/(tabs)/menu')}>
        <Text style={styles.fullMenuCtaText}>View Full Menu →</Text>
      </Pressable>
    </View>
  );
}

function SpecialtyBlock({
  title,
  products,
  muted,
}: {
  title: string;
  products: CatalogProduct[];
  muted?: boolean;
}) {
  if (!products.length) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {products.map((p) => (
        <View key={p.id} style={[styles.specialtyCard, muted && styles.specialtyMuted]}>
          <Text style={styles.specialtyBadge}>{productHomeBadge(p) ?? title}</Text>
          <Text style={styles.specialtyName}>{p.name}</Text>
          {p.description ? (
            <Text style={styles.specialtyDesc} numberOfLines={2}>
              {p.description}
            </Text>
          ) : null}
          {!muted && p.price != null ? (
            <Text style={styles.specialtyPrice}>{formatCurrency(Number(p.price))}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function OffersSection() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const offers =
    config.offers?.filter((o) => (o as { isActive?: boolean }).isActive !== false) ?? [];
  const banners = config.banners.filter((b) => b.isActive);

  if (!offers.length && !banners.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Active Offers" />
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

  if (!authed || !profile?.recentOrders?.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Recently Ordered" />
      {profile.recentOrders.slice(0, 3).map((o) => (
        <Pressable
          key={o.id}
          style={styles.recentCard}
          onPress={() => router.push(`/track/${encodeURIComponent(o.orderNumber)}`)}
        >
          <Text style={[styles.recentNum, { color: colors.primary }]}>#{o.orderNumber}</Text>
          <Text style={styles.recentMeta}>{o.deliveryAddress}</Text>
          <Text style={styles.recentTotal}>₹{o.grandTotal}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function useHomeCatalog() {
  return useQuery({
    queryKey: ['home-catalog'],
    queryFn: () => api.list<CatalogProduct>('/products?limit=80'),
    staleTime: 60_000,
  });
}

export function HomeSectionList() {
  const config = useAppConfig();
  const sections = useMemo(() => config.homepage.filter((s) => s.isEnabled), [config.homepage]);
  const catalogQuery = useHomeCatalog();
  const products = catalogQuery.data?.data ?? [];

  const catalog = useMemo(
    () =>
      allocateHomeCatalog(products, {
        popularLimit: 4,
        menuPreviewLimit: 6,
        comingSoonLimit: 6,
        preOrderLimit: 6,
        includeRecommended: false,
      }),
    [products],
  );

  const hasHero = sections.some((s) => s.sectionKey === 'hero_banner');
  const hasCategories = sections.some((s) => s.sectionKey === 'categories');
  const enabledKeys = useMemo(() => new Set(sections.map((s) => s.sectionKey)), [sections]);

  const showPopular =
    enabledKeys.has('popular_items') ||
    enabledKeys.has('best_sellers') ||
    enabledKeys.has('featured_items') ||
    !sections.length;
  const showMenuPreview =
    enabledKeys.has('new_arrivals') ||
    enabledKeys.has('combos') ||
    enabledKeys.has('festival_specials') ||
    enabledKeys.has('todays_offers') ||
    !sections.length;
  const showRecently = enabledKeys.has('recently_ordered');

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
      ) : (
        sections
          .filter((s) => s.sectionKey === 'hero_banner')
          .map((s) => <HeroSection key={s.id} section={s} />)
      )}

      {!sections.length || hasCategories ? <CategoriesSection /> : null}

      <InlineHomeSearch />

      {catalogQuery.isLoading ? (
        <View style={styles.section}>
          <FoodCardSkeleton />
        </View>
      ) : (
        <>
          {showPopular ? (
            <ProductCarouselBlock title="Popular Near You" products={catalog.popular} emoji="🔥" />
          ) : null}

          <OffersSection />

          <SpecialtyBlock title="Pre-Order" products={catalog.preOrder} />
          <SpecialtyBlock title="Coming Soon" products={catalog.comingSoon} muted />

          {showMenuPreview ? (
            <ProductListBlock
              title="Menu Preview"
              subtitle="A short selection — open the full menu for everything."
              products={catalog.menuPreview}
            />
          ) : (
            <View style={styles.section}>
              <Pressable style={styles.fullMenuCta} onPress={() => router.push('/(tabs)/menu')}>
                <Text style={styles.fullMenuCtaText}>View Full Menu →</Text>
              </Pressable>
            </View>
          )}

          {showRecently ? <RecentlyOrderedSection /> : null}
        </>
      )}

      <ChargeHintStrip />
      <View style={{ height: 88 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 24 },
  section: { paddingHorizontal: 16, paddingTop: 14 },
  sectionHint: { color: COLORS.textMuted, fontSize: 13, marginBottom: 10, marginTop: -4 },
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
  searchBlock: { paddingHorizontal: 16, paddingTop: 12 },
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
    padding: 14,
    marginRight: 10,
    width: 220,
    ...SHADOW.card,
  },
  offerTitle: { fontWeight: '800', fontSize: 15 },
  offerBody: { color: COLORS.textMuted, marginTop: 6, fontSize: 12 },
  offerTitleLight: { color: '#fff', fontWeight: '800', fontSize: 15 },
  offerBodyLight: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 12 },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  recentNum: { fontWeight: '800' },
  recentMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  recentTotal: { fontWeight: '700', marginTop: 4 },
  fullMenuCta: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullMenuCtaText: { fontWeight: '800', color: COLORS.primary },
  specialtyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  specialtyMuted: { opacity: 0.92, borderStyle: 'dashed' },
  specialtyBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  specialtyName: { fontWeight: '800', fontSize: 15, color: COLORS.text, marginTop: 4 },
  specialtyDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  specialtyPrice: { fontWeight: '700', marginTop: 6, color: COLORS.primary },
});
