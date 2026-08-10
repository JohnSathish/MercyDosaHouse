import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CheckoutProfileDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

const TIER_INFO: Record<string, { emoji: string; next: string; threshold: number }> = {
  BRONZE: { emoji: '🥉', next: 'Silver', threshold: 500 },
  SILVER: { emoji: '🥈', next: 'Gold', threshold: 1500 },
  GOLD: { emoji: '🥇', next: 'Platinum', threshold: 3000 },
  PLATINUM: { emoji: '💎', next: 'Platinum', threshold: 3000 },
};

export default function LoyaltyScreen() {
  const colors = useThemeColors();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['checkout-profile'],
    queryFn: () => api.get<CheckoutProfileDto>('/users/me/checkout-profile'),
    retry: false,
  });

  const tier = profile?.loyaltyTier ?? 'BRONZE';
  const info = TIER_INFO[tier] ?? TIER_INFO.BRONZE;
  const points = profile?.loyaltyPoints ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Loyalty Rewards</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.empty}>Sign in to view your loyalty status.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <Text style={styles.heroEmoji}>{info.emoji}</Text>
            <Text style={styles.heroTier}>{tier} Member</Text>
            <Text style={styles.heroPoints}>{points} points</Text>
            <Text style={styles.heroHint}>1 point = ₹1 off at checkout</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            <Text style={styles.cardBody}>• Earn points on every order</Text>
            <Text style={styles.cardBody}>• Redeem points at checkout</Text>
            <Text style={styles.cardBody}>• Higher tiers unlock exclusive offers</Text>
          </View>

          {tier !== 'PLATINUM' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Next tier: {info.next}</Text>
              <Text style={styles.cardBody}>Keep ordering to reach {info.next} status!</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 48 },
  heroTier: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  heroPoints: { color: '#FDE68A', fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', color: '#14532D', marginBottom: 8 },
  cardBody: { color: '#6B7280', fontSize: 14, marginBottom: 4 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
});
