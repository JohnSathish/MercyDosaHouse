import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CreateReviewRequest, OrderDto, ReviewDto } from '@mdh/types';
import { REVIEW_ISSUES, REVIEW_LIKES } from '@mdh/types';
import { api } from '@/lib/api';
import { COLORS, RADIUS } from '@/ui/theme';

const COMMENT_MAX = 1000;

const LIKE_OPTIONS: { key: (typeof REVIEW_LIKES)[number]; label: string }[] = [
  { key: 'FOOD_QUALITY', label: 'Food Quality' },
  { key: 'TASTE', label: 'Taste' },
  { key: 'PACKAGING', label: 'Packaging' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'PORTION', label: 'Portion Size' },
  { key: 'VALUE', label: 'Value for Money' },
];

const ISSUE_OPTIONS: { key: (typeof REVIEW_ISSUES)[number]; label: string }[] = [
  { key: 'FOOD_QUALITY', label: 'Food quality' },
  { key: 'TASTE', label: 'Taste' },
  { key: 'DELIVERY_DELAY', label: 'Delivery delay' },
  { key: 'MISSING_ITEM', label: 'Missing item' },
  { key: 'WRONG_ITEM', label: 'Wrong item' },
  { key: 'PACKAGING', label: 'Packaging' },
  { key: 'PRICING', label: 'Pricing' },
  { key: 'OTHER', label: 'Other' },
];

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8} style={styles.starHit}>
          <Text style={[styles.star, n <= value ? styles.starOn : styles.starOff]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function RateOrderSheet({
  order,
  visible,
  onClose,
}: {
  order: OrderDto;
  visible: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['review-order', order.id],
    queryFn: () => api.get<ReviewDto | null>(`/reviews/order/${order.id}`),
    enabled: visible,
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [likes, setLikes] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [thanks, setThanks] = useState(false);
  const uniqueItems = order.items;

  useEffect(() => {
    if (!visible) {
      setThanks(false);
      return;
    }
    if (thanks) return;
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? '');
    setLikes(existing?.likes ?? []);
    setIssues(existing?.issues ?? []);
    const next: Record<string, number> = {};
    for (const item of existing?.items ?? []) {
      if (item.orderItemId) next[item.orderItemId] = item.rating;
    }
    setItemRatings(next);
  }, [visible, existing, thanks]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateReviewRequest = {
        orderId: order.id,
        rating,
        comment: comment.trim() || undefined,
        likes,
        issues: rating <= 2 ? issues : [],
        items: uniqueItems
          .filter((item) => itemRatings[item.id])
          .map((item) => ({
            orderItemId: item.id,
            productId: item.productId,
            rating: itemRatings[item.id],
          })),
      };
      if (existing?.id) return api.patch(`/reviews/${existing.id}`, payload);
      return api.post('/reviews', payload);
    },
    onSuccess: () => {
      setThanks(true);
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['my-reviews'] });
      void qc.invalidateQueries({ queryKey: ['review-order', order.id] });
    },
  });

  function toggle(list: string[], key: string, set: (v: string[]) => void) {
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          {thanks ? (
            <View style={styles.thanks}>
              <Text style={styles.title}>Thank you for your feedback! ❤️</Text>
              <Text style={styles.sub}>We appreciate your support of Mercy Dosa House.</Text>
              <Pressable style={styles.submit} onPress={onClose}>
                <Text style={styles.submitText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>How was your experience?</Text>
              <Text style={styles.sub}>Your feedback helps us serve you better. ❤️</Text>
              <Text style={styles.label}>Rate your order</Text>
              <Stars value={rating} onChange={setRating} />
              {rating > 0 && rating <= 2 ? (
                <View style={styles.sorry}>
                  <Text style={styles.sorryTitle}>
                    We&apos;re sorry your experience wasn&apos;t perfect. 💚
                  </Text>
                  <Text style={styles.sub}>Please tell us what went wrong so we can improve.</Text>
                  <View style={styles.chips}>
                    {ISSUE_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.key}
                        onPress={() => toggle(issues, opt.key, setIssues)}
                        style={[styles.chip, issues.includes(opt.key) && styles.chipOn]}
                      >
                        <Text
                          style={[styles.chipText, issues.includes(opt.key) && styles.chipTextOn]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              <Text style={styles.label}>What did you like?</Text>
              <View style={styles.chips}>
                {LIKE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => toggle(likes, opt.key, setLikes)}
                    style={[styles.chip, likes.includes(opt.key) && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, likes.includes(opt.key) && styles.chipTextOn]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {uniqueItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Stars
                    value={itemRatings[item.id] ?? 0}
                    onChange={(n) => setItemRatings((p) => ({ ...p, [item.id]: n }))}
                  />
                </View>
              ))}
              <Text style={styles.label}>Tell us about your experience</Text>
              <TextInput
                value={comment}
                onChangeText={(t) => setComment(t.slice(0, COMMENT_MAX))}
                placeholder="How was the food, delivery, packaging, and overall experience?"
                placeholderTextColor={COLORS.textMuted}
                multiline
                style={styles.input}
              />
              <Text style={styles.count}>{COMMENT_MAX - comment.length} characters left</Text>
              {mutation.isError ? (
                <Text style={styles.err}>{(mutation.error as Error).message}</Text>
              ) : null}
              <Pressable
                style={[styles.submit, rating < 1 && { opacity: 0.5 }]}
                disabled={rating < 1 || mutation.isPending}
                onPress={() => mutation.mutate()}
              >
                <Text style={styles.submitText}>
                  {mutation.isPending
                    ? 'Submitting…'
                    : existing?.id
                      ? 'Update Feedback'
                      : 'Submit Feedback'}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 99,
    height: 4,
    marginTop: 8,
    width: 40,
  },
  close: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  closeText: { color: COLORS.textMuted, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  sub: { color: COLORS.textMuted, marginTop: 4, marginBottom: 12 },
  label: { fontWeight: '700', marginTop: 10, marginBottom: 6, color: COLORS.text },
  stars: { flexDirection: 'row', gap: 4 },
  starHit: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 28 },
  starOn: { color: '#F59E0B' },
  starOff: { color: '#D1D5DB' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  chipTextOn: { color: '#fff' },
  sorry: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  sorryTitle: { color: COLORS.primary, fontWeight: '700' },
  itemRow: { marginTop: 8 },
  itemName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  input: {
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
  },
  count: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  err: { color: '#B91C1C', marginTop: 8 },
  submit: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800' },
  thanks: { padding: 24 },
});
