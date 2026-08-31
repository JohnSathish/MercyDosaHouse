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
import type { LoyaltyMeDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

export default function LoyaltyScreen() {
  const colors = useThemeColors();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['loyalty-me'],
    queryFn: () => api.get<LoyaltyMeDto>('/loyalty/me'),
    retry: false,
  });

  const a = data?.account;
  const cfg = data?.config;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>🪙 Bronze Coins</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error || !a ? (
        <Text style={styles.empty}>Sign in to view your Bronze Coins.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <Text style={styles.heroEmoji}>{a.coinSymbol}</Text>
            <Text style={styles.heroTier}>{a.coinName}</Text>
            <Text style={styles.heroPoints}>{a.available} Coins</Text>
            <Text style={styles.heroHint}>Worth ₹{a.valueAvailable}</Text>
            <Text style={styles.heroSub}>Keep ordering & earn more rewards!</Text>
          </View>

          <View style={styles.stats}>
            {[
              ['Available', a.available],
              ['Pending', a.pending],
              ['Earned', a.totalEarned],
              ['Redeemed', a.totalRedeemed],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How Bronze Coins Work</Text>
            <Text style={styles.cardBody}>1️⃣ Place an order</Text>
            <Text style={styles.cardBody}>2️⃣ Complete your order</Text>
            <Text style={styles.cardBody}>
              3️⃣ Earn {cfg?.coinsPerOrder ?? 1} Bronze Coin {cfg?.earnWhenLabel}
            </Text>
            <Text style={styles.cardBody}>4️⃣ Collect coins with every order</Text>
            <Text style={styles.cardBody}>
              5️⃣ Redeem (min {cfg?.minRedeem ?? 10}, max {cfg?.maxRedeemPerOrder ?? 100} / order)
            </Text>
            <Text style={[styles.cardBody, { fontWeight: '700', color: '#14532D', marginTop: 8 }]}>
              1 Bronze Coin = ₹{cfg?.coinValue ?? 1}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bronze Coins History</Text>
            {data?.transactions.length ? (
              data.transactions.map((t) => (
                <View key={t.id} style={styles.txn}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnTitle}>
                      {t.coins >= 0 ? '🪙 +' : '🪙 '}
                      {t.coins}
                      {t.orderNumber ? `  #${t.orderNumber}` : ''}
                    </Text>
                    <Text style={styles.txnDesc}>{t.description}</Text>
                    <Text style={styles.txnDate}>
                      {new Date(t.createdAt).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={{ color: t.coins >= 0 ? '#059669' : '#DC2626', fontWeight: '800' }}>
                    {t.coins >= 0 ? '+' : ''}
                    {t.coins}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.cardBody}>No coin activity yet.</Text>
            )}
            <Pressable onPress={() => void refetch()}>
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          </View>
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
  content: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 48 },
  heroTier: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  heroPoints: { color: '#FDE68A', fontSize: 32, fontWeight: '800', marginTop: 4 },
  heroHint: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stat: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#B45309' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: '700', color: '#14532D', marginBottom: 8 },
  cardBody: { color: '#6B7280', fontSize: 14, marginBottom: 4 },
  txn: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txnTitle: { fontWeight: '700', color: '#1F2937' },
  txnDesc: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  txnDate: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  refresh: { color: '#14532D', fontWeight: '700', marginTop: 10 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
});
