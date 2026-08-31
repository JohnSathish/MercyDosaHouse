import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReviewDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';
import { COLORS, RADIUS, SHADOW } from '@/ui/theme';

export default function MyFeedbackScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { data: reviews = [], isError } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => api.get<ReviewDto[]>('/reviews/mine'),
    retry: false,
  });

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>My Feedback</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isError ? <Text style={styles.muted}>Sign in to see your reviews.</Text> : null}
        {!isError && !reviews.length ? (
          <Text style={styles.muted}>No reviews yet. Rate a delivered order from Orders.</Text>
        ) : null}
        {reviews.map((review) => (
          <View key={review.id} style={styles.card}>
            <Text style={styles.stars}>{'★'.repeat(review.rating)}</Text>
            {review.verified ? <Text style={styles.verified}>✓ Verified Order</Text> : null}
            {review.orderNumber ? (
              <Text style={styles.meta}>Order #{review.orderNumber}</Text>
            ) : null}
            {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
            {review.ownerReply ? (
              <View style={styles.reply}>
                <Text style={styles.replyTitle}>Mercy Dosa House</Text>
                <Text style={styles.comment}>{review.ownerReply}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  muted: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
  card: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: 10,
    padding: 14,
  },
  stars: { color: '#F59E0B', fontSize: 16 },
  verified: { color: '#047857', fontSize: 11, fontWeight: '800', marginTop: 4 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  comment: { color: COLORS.text, marginTop: 6, fontSize: 14 },
  reply: {
    backgroundColor: '#FFF8E8',
    borderRadius: 12,
    marginTop: 10,
    padding: 10,
  },
  replyTitle: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
});
