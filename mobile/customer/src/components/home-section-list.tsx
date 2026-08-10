import type { MobileHomeSectionDto, CheckoutProfileDto } from '@mdh/types';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth-storage';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import {
  AnnouncementBar,
  HomeDeliverySection,
  PreOrderComingSoonSection,
} from './announcement-bar';
import { ProductRow } from './product-row';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  prepTimeMinutes?: number;
}

function SectionShell({
  title,
  children,
  primary,
}: {
  title: string;
  children: React.ReactNode;
  primary: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: primary }]}>{title}</Text>
      {children}
    </View>
  );
}

function CategoriesSection({ primary }: { primary: string }) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'mobile'],
    queryFn: () => api.get<Category[]>('/categories?active=true&channel=mobile'),
  });

  if (isLoading) return <ActivityIndicator color={primary} />;

  return (
    <SectionShell title="Categories" primary={primary}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={styles.categoryChip}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.categoryIcon}>{cat.icon ?? '🍽️'}</Text>
            <Text style={styles.categoryName}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SectionShell>
  );
}

function ProductsSection({
  title,
  query,
  primary,
}: {
  title: string;
  query: string;
  primary: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', query],
    queryFn: () => api.list<Product>(`/products?available=true&${query}`),
  });

  if (isLoading) return <ActivityIndicator color={primary} />;
  const products = data?.data ?? [];

  if (!products.length) {
    return (
      <SectionShell title={title} primary={primary}>
        <Text style={styles.empty}>No items yet.</Text>
      </SectionShell>
    );
  }

  return (
    <SectionShell title={title} primary={primary}>
      {products.slice(0, 6).map((p) => (
        <ProductRow key={p.id} product={p} showFavorite />
      ))}
    </SectionShell>
  );
}

function RecentlyOrderedSection({ primary }: { primary: string }) {
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
    <SectionShell title="Recently Ordered" primary={primary}>
      {!authed ? (
        <Text style={styles.empty}>Sign in to see your recent orders.</Text>
      ) : profile?.recentOrders?.length ? (
        profile.recentOrders.slice(0, 3).map((o) => (
          <Pressable
            key={o.id}
            style={styles.recentCard}
            onPress={() => router.push(`/track/${encodeURIComponent(o.orderNumber)}`)}
          >
            <Text style={styles.recentNum}>#{o.orderNumber}</Text>
            <Text style={styles.recentMeta}>{o.deliveryAddress}</Text>
            <Text style={styles.recentTotal}>₹{o.grandTotal}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.empty}>No recent orders yet.</Text>
      )}
    </SectionShell>
  );
}

function HeroSection({
  section,
  primary,
  secondary,
}: {
  section: MobileHomeSectionDto;
  primary: string;
  secondary: string;
}) {
  const content = section.content as { title?: string; subtitle?: string };
  const config = useAppConfig();

  return (
    <View style={[styles.hero, { backgroundColor: primary }]}>
      <Text style={styles.heroBadge}>✨ {config.branding.tagline}</Text>
      <Text style={styles.heroTitle}>{content.title ?? config.branding.appName}</Text>
      <Text style={styles.heroSubtitle}>
        {content.subtitle ?? 'Fresh dosas delivered to your door'}
      </Text>
      <Pressable
        style={[styles.heroCta, { backgroundColor: secondary }]}
        onPress={() => router.push('/(tabs)/menu')}
      >
        <Text style={styles.heroCtaText}>Order Now</Text>
      </Pressable>
    </View>
  );
}

function PromoBannersSection({ primary }: { primary: string }) {
  const config = useAppConfig();
  const banners = config.banners.filter((b) => b.isActive);

  if (!banners.length) return null;

  return (
    <SectionShell title="Offers" primary={primary}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {banners.map((b) => (
          <View key={b.id} style={styles.promoCard}>
            <Text style={styles.promoTitle}>{b.title}</Text>
            {b.subtitle ? <Text style={styles.promoSub}>{b.subtitle}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SectionShell>
  );
}

function renderSection(
  section: MobileHomeSectionDto,
  colors: { primary: string; secondary: string },
) {
  switch (section.sectionKey) {
    case 'hero_banner':
      return (
        <HeroSection
          key={section.id}
          section={section}
          primary={colors.primary}
          secondary={colors.secondary}
        />
      );
    case 'categories':
      return <CategoriesSection key={section.id} primary={colors.primary} />;
    case 'popular_items':
      return (
        <ProductsSection
          key={section.id}
          title="Popular Items"
          query="popular=true"
          primary={colors.primary}
        />
      );
    case 'featured_items':
    case 'best_sellers':
    case 'recommended_items':
    case 'new_arrivals':
    case 'combos':
    case 'festival_specials':
    case 'todays_offers':
      return (
        <ProductsSection
          key={section.id}
          title={section.title ?? section.sectionKey}
          query="limit=8"
          primary={colors.primary}
        />
      );
    case 'promotional_banners':
      return <PromoBannersSection key={section.id} primary={colors.primary} />;
    case 'recently_ordered':
      return <RecentlyOrderedSection key={section.id} primary={colors.primary} />;
    default:
      return null;
  }
}

export function HomeSectionList() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const sections = config.homepage.filter((s) => s.isEnabled);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AnnouncementBar />
      <HomeDeliverySection />
      <PreOrderComingSoonSection />
      <View style={styles.searchWrap}>
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Text style={styles.searchPlaceholder}>🔍 Search dishes…</Text>
        </Pressable>
      </View>
      {sections.map((section) => renderSection(section, colors))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7E6' },
  content: { paddingBottom: 32 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchPlaceholder: { color: '#9CA3AF', fontSize: 14 },
  section: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 14 },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 80,
  },
  categoryIcon: { fontSize: 24, marginBottom: 4 },
  categoryName: { fontSize: 12, fontWeight: '600', color: '#1F2937' },
  hero: { margin: 16, borderRadius: 20, padding: 20 },
  heroBadge: { color: '#FDE68A', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 14 },
  heroCta: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroCtaText: { color: '#1F2937', fontWeight: '700' },
  promoCard: {
    backgroundColor: '#14532D',
    borderRadius: 14,
    marginRight: 10,
    padding: 16,
    minWidth: 200,
  },
  promoTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  promoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recentNum: { fontWeight: '700', color: '#14532D', fontFamily: 'monospace' },
  recentMeta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  recentTotal: { fontWeight: '700', marginTop: 4 },
});
