import type { BannerDto, MobileHomeSectionDto, CheckoutProfileDto } from '@mdh/types';
import { allocateHomeCatalog, formatCurrency } from '@mdh/utils';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth-storage';
import { WEBSITE_URL } from '@/lib/constants';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { AnnouncementBar, HomeDeliverySection } from './announcement-bar';
import { AppExclusiveBadge } from './app-exclusive-badge';
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
  slug?: string;
}

type CatalogProduct = FoodCardProduct & {
  categoryId?: string;
  category?: { id: string; name: string; slug?: string };
  isFeatured?: boolean;
  isBestseller?: boolean;
  isOnOffer?: boolean;
  isPreOrder?: boolean;
  isComingSoon?: boolean;
  isAvailable?: boolean;
};

type HeroSlide = {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  price?: number;
  offerLabel?: string;
  preOrderNote?: string;
  ctaText?: string;
  linkUrl?: string;
};

const HERO_WIDTH = Dimensions.get('window').width - 28;

function ChargeHintStrip() {
  const config = useAppConfig();
  const d = config.delivery;
  const freeMsg = d.freeDeliveryLimit > 0 ? ` · Free above ₹${d.freeDeliveryLimit}` : '';
  return (
    <View style={styles.chargeStrip}>
      <Text style={styles.chargeText}>
        Delivery ₹{d.deliveryCharge} · Packing from ₹{d.packingCharge}
        {freeMsg}
      </Text>
    </View>
  );
}

function FssaiTrustCard() {
  const config = useAppConfig();
  const business = config.business;
  if (business.fssaiEnabled === false || !business.fssaiRegistrationNumber) return null;

  return (
    <View style={styles.fssaiCard}>
      <Text style={styles.fssaiTitle}>🛡️ FSSAI Registered Food Business</Text>
      <Text style={styles.fssaiNumber}>Registration No. {business.fssaiRegistrationNumber}</Text>
      <Text style={styles.fssaiMeta}>
        {business.fssaiKindOfBusiness ?? 'Food Vending Establishment'} · {business.address}
      </Text>
      {business.fssaiCertificateUrl ? (
        <Pressable onPress={() => void Linking.openURL(business.fssaiCertificateUrl!)}>
          <Text style={styles.fssaiLink}>View registration certificate</Text>
        </Pressable>
      ) : null}
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
    enabled: query.trim().length >= 1,
  });

  const products = data?.data ?? [];

  return (
    <View style={styles.searchBlock}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search for dosa, idli, biryani..."
      />
      {query.trim().length >= 1 ? (
        <View style={styles.searchResults}>
          {isFetching && !products.length ? (
            <FoodCardSkeleton />
          ) : products.length ? (
            products.slice(0, 5).map((p) => <FoodCard key={p.id} product={p} showFavorite />)
          ) : (
            <Text style={styles.empty}>No matches for “{query}”</Text>
          )}
          {products.length > 0 ? (
            <Pressable onPress={() => router.push({ pathname: '/search', params: { q: query } })}>
              <Text style={[styles.seeAll, { color: colors.secondary }]}>See all results →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CategoriesSection() {
  const { data: categoriesRaw = [], isLoading } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () =>
      api.get<Category[] | { data: Category[] }>('/categories?active=true&channel=mobile'),
  });
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw
    : Array.isArray(categoriesRaw.data)
      ? categoriesRaw.data
      : [];

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Explore Categories"
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/menu')}
      />
      {isLoading ? (
        <FoodCardSkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <CategoryChip
            compact
            icon="🍽️"
            label="All"
            active
            onPress={() => router.push('/(tabs)/menu')}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              compact
              icon={cat.icon}
              label={cat.name}
              onPress={() =>
                router.push({ pathname: '/(tabs)/menu', params: { categoryId: cat.id } })
              }
            />
          ))}
          <CategoryChip
            compact
            icon="➕"
            label="More"
            onPress={() => router.push('/(tabs)/menu')}
          />
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
        actionLabel="See all"
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
      <Pressable style={styles.fullMenuLink} onPress={() => router.push('/(tabs)/menu')}>
        <Text style={styles.fullMenuLinkText}>View Full Menu →</Text>
      </Pressable>
    </View>
  );
}

/** Compact admin-driven offer strip (offers CMS). */
function CompactOfferCard() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const offer = config.offers?.find((o) => o.isActive !== false) ?? config.offers?.[0] ?? null;

  if (!offer) return null;

  const discount =
    offer.discountPct != null
      ? `${offer.discountPct}% OFF`
      : offer.title.replace(/^special offer[:\s]*/i, '') || offer.title;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.offerStrip}
        onPress={() => router.push((offer.buttonUrl as never) || ('/(tabs)/menu' as never))}
      >
        <Text style={styles.offerGift}>🎁</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.offerStripTitle, { color: colors.primary }]}>
            Special Offer: {discount}
          </Text>
          {offer.description ? (
            <Text style={styles.offerStripBody} numberOfLines={1}>
              {offer.description}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.offerCta, { color: colors.secondary }]}>
          {offer.buttonLabel ?? 'Order Now'} →
        </Text>
      </Pressable>
    </View>
  );
}

function buildHeroSlides(
  section: MobileHomeSectionDto | undefined,
  banners: BannerDto[],
  config: ReturnType<typeof useAppConfig>,
): HeroSlide[] {
  const slides: HeroSlide[] = [];

  const content = (section?.content ?? {}) as {
    badge?: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    ctaText?: string;
    price?: number;
    offerLabel?: string;
    preOrderNote?: string;
    linkUrl?: string;
    productId?: string;
  };

  if (content.title || content.imageUrl) {
    slides.push({
      id: section?.id ?? 'hero-section',
      badge: content.badge ?? "Today's Special",
      title: content.title ?? config.branding.appName,
      subtitle: content.subtitle,
      imageUrl: content.imageUrl,
      price: content.price,
      offerLabel: content.offerLabel,
      preOrderNote: content.preOrderNote,
      ctaText: content.ctaText ?? 'Order Now',
      linkUrl: content.linkUrl ?? (content.productId ? `/product/${content.productId}` : undefined),
    });
  }

  for (const b of banners.filter((x) => x.isActive)) {
    slides.push({
      id: b.id,
      badge: "Today's Special",
      title: b.title,
      subtitle: b.subtitle ?? undefined,
      imageUrl: b.imageUrl,
      ctaText: 'Order Now',
      linkUrl: b.linkUrl ?? undefined,
    });
  }

  const heroPromo = config.marketing?.byPlacement?.HERO_SECTION?.[0];
  if (!slides.length && heroPromo) {
    slides.push({
      id: heroPromo.id,
      badge: "Today's Special",
      title: heroPromo.title,
      subtitle: heroPromo.shortMessage ?? undefined,
      imageUrl: heroPromo.heroBannerImageUrl ?? heroPromo.bannerImageUrl ?? undefined,
      ctaText: heroPromo.ctaText ?? 'Order Now',
      linkUrl: heroPromo.ctaUrl ?? heroPromo.linkUrl ?? undefined,
    });
  }

  if (!slides.length) {
    slides.push({
      id: 'fallback-hero',
      badge: "Today's Special",
      title: config.branding.appName,
      subtitle: config.branding.tagline,
      ctaText: 'Order Now',
    });
  }

  return slides;
}

function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const colors = useThemeColors();
  const [index, setIndex] = useState(0);
  const scrolling = useRef(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrolling.current) return;
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / (HERO_WIDTH + 10));
    if (next !== index && next >= 0 && next < slides.length) setIndex(next);
  };

  return (
    <View style={styles.heroWrap}>
      <ScrollView
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={HERO_WIDTH + 10}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          scrolling.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          scrolling.current = false;
          onScroll(e);
        }}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
      >
        {slides.map((slide) => {
          const imageUri = resolveAssetUrl(slide.imageUrl, WEBSITE_URL);
          return (
            <View
              key={slide.id}
              style={[styles.hero, { width: HERO_WIDTH, backgroundColor: colors.primary }]}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
              ) : null}
              <View style={styles.heroScrim} />
              <View style={styles.heroOverlay}>
                <Text style={styles.heroEyebrow}>{slide.badge ?? "Today's Special"}</Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {slide.title}
                </Text>
                {slide.subtitle ? (
                  <Text style={styles.heroSub} numberOfLines={2}>
                    {slide.subtitle}
                  </Text>
                ) : null}
                <View style={styles.heroMetaRow}>
                  {slide.price != null ? (
                    <Text style={styles.heroPrice}>{formatCurrency(slide.price)}</Text>
                  ) : null}
                  {slide.offerLabel ? (
                    <Text style={styles.heroOffer}>{slide.offerLabel}</Text>
                  ) : null}
                </View>
                {slide.preOrderNote ? (
                  <Text style={styles.heroPreOrder}>⏱ {slide.preOrderNote}</Text>
                ) : null}
                <Pressable
                  style={[styles.heroCta, { backgroundColor: colors.secondary }]}
                  onPress={() => router.push((slide.linkUrl as never) || ('/(tabs)/menu' as never))}
                >
                  <Text style={styles.heroCtaText}>{slide.ctaText ?? 'Order Now'} ›</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MenuPreviewSection({
  products,
  categories,
}: {
  products: CatalogProduct[];
  categories: Category[];
}) {
  const colors = useThemeColors();
  const [activeCategoryId, setActiveCategoryId] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    const available = products.filter((p) => p.isComingSoon !== true);
    if (activeCategoryId === 'all') return available.slice(0, 8);
    return available.filter((p) => p.categoryId === activeCategoryId).slice(0, 8);
  }, [products, activeCategoryId]);

  if (!products.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="🍽️ From Our Menu"
        actionLabel="View Full Menu"
        onAction={() => router.push('/(tabs)/menu')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.menuChips}
      >
        <Pressable
          onPress={() => setActiveCategoryId('all')}
          style={[
            styles.menuChip,
            activeCategoryId === 'all' && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.menuChipText, activeCategoryId === 'all' && { color: '#fff' }]}>
            All
          </Text>
        </Pressable>
        {categories.map((cat) => {
          const active = activeCategoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCategoryId(cat.id)}
              style={[
                styles.menuChip,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.menuChipText, active && { color: '#fff' }]}>{cat.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filtered.map((p) => (
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
    queryFn: () => api.list<CatalogProduct>('/products?available=true&limit=80'),
    staleTime: 60_000,
  });
}

export function HomeSectionList() {
  const config = useAppConfig();
  const sections = useMemo(
    () => (Array.isArray(config.homepage) ? config.homepage.filter((s) => s.isEnabled) : []),
    [config.homepage],
  );
  const catalogQuery = useHomeCatalog();
  const products = catalogQuery.data?.data ?? [];

  const { data: categoriesRaw = [] } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () =>
      api.get<Category[] | { data: Category[] }>('/categories?active=true&channel=mobile'),
  });
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw
    : Array.isArray(categoriesRaw.data)
      ? categoriesRaw.data
      : [];

  const catalog = useMemo(
    () =>
      allocateHomeCatalog(products, {
        popularLimit: 4,
        menuPreviewLimit: 8,
        comingSoonLimit: 4,
        preOrderLimit: 4,
        includeRecommended: false,
      }),
    [products],
  );

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

  const heroSection = sections.find((s) => s.sectionKey === 'hero_banner');
  const heroSlides = useMemo(
    () => buildHeroSlides(heroSection, config.banners ?? [], config),
    [heroSection, config],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AnnouncementBar />
      <AppExclusiveBadge />
      <StoreStatusCard />
      <HomeDeliverySection />
      <FssaiTrustCard />

      <HeroCarousel slides={heroSlides} />

      {!sections.length || hasCategories ? <CategoriesSection /> : null}

      {catalogQuery.isLoading ? (
        <View style={styles.section}>
          <FoodCardSkeleton />
        </View>
      ) : (
        <>
          {showPopular ? (
            <ProductCarouselBlock title="Popular Near You" products={catalog.popular} emoji="🔥" />
          ) : null}

          <CompactOfferCard />

          {showMenuPreview ? (
            <MenuPreviewSection products={products} categories={categories} />
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
  section: { paddingHorizontal: 14, paddingTop: 14 },
  empty: { color: COLORS.textMuted, fontSize: 14, paddingVertical: 8 },
  chargeStrip: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: COLORS.amberSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chargeText: { color: '#92400E', fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  fssaiCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
  },
  fssaiTitle: { color: '#14532D', fontSize: 13, fontWeight: '800' },
  fssaiNumber: { color: '#166534', fontSize: 12, fontWeight: '700', marginTop: 4 },
  fssaiMeta: { color: '#4B5563', fontSize: 11, marginTop: 3 },
  fssaiLink: { color: '#14532D', fontSize: 12, fontWeight: '800', marginTop: 7 },
  searchBlock: { paddingHorizontal: 14, paddingTop: 12 },
  searchResults: { marginTop: 12 },
  seeAll: { fontWeight: '700', marginTop: 8, textAlign: 'center' },
  heroWrap: { paddingTop: 12 },
  hero: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    minHeight: 188,
    ...SHADOW.card,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 40, 28, 0.48)',
  },
  heroOverlay: { padding: 16, justifyContent: 'flex-end', minHeight: 188 },
  heroEyebrow: {
    alignSelf: 'flex-start',
    color: '#14532D',
    backgroundColor: '#FDE68A',
    overflow: 'hidden',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  heroPrice: { color: '#fff', fontWeight: '800', fontSize: 18 },
  heroOffer: {
    color: '#14532D',
    backgroundColor: '#FDE68A',
    overflow: 'hidden',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  heroPreOrder: { color: 'rgba(253,230,138,0.95)', fontSize: 12, fontWeight: '600', marginTop: 6 },
  heroCta: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.md,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroCtaText: { color: COLORS.text, fontWeight: '800' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: { backgroundColor: COLORS.primary, width: 14 },
  offerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  offerGift: { fontSize: 22 },
  offerStripTitle: { fontWeight: '800', fontSize: 13.5 },
  offerStripBody: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
  offerCta: { fontWeight: '800', fontSize: 12 },
  menuChips: { paddingBottom: 10, gap: 8 },
  menuChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  menuChipText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
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
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullMenuCtaText: { fontWeight: '800', color: COLORS.primary },
  fullMenuLink: { marginTop: 10, alignItems: 'center' },
  fullMenuLinkText: { fontWeight: '700', color: COLORS.secondary, fontSize: 13 },
});
