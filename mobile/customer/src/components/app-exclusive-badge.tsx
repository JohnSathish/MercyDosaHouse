import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import type { AvailableCouponDto } from '@mdh/types';
import { api } from '@/lib/api';

export function AppExclusiveBadge() {
  const { data: coupons = [] } = useQuery({
    queryKey: ['app-exclusive-coupons'],
    queryFn: () => api.get<AvailableCouponDto[]>('/coupons/available?subtotal=100000'),
    staleTime: 60_000,
  });
  const android = coupons.filter((c) => c.appliesTo === 'ANDROID');
  if (!android.length) return null;
  const offer = android[0];
  const value = offer.type === 'PERCENTAGE' ? `${offer.value}% OFF` : `₹${offer.value} OFF`;

  return (
    <View style={styles.badge}>
      <Text style={styles.title}>📱 APP EXCLUSIVE — {value}</Text>
      <Text style={styles.body}>
        {offer.minOrderAmount > 0
          ? `On your first app order of ₹${offer.minOrderAmount} or more`
          : offer.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  title: { color: '#FDE68A', fontWeight: '800', fontSize: 13 },
  body: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.9 },
});
