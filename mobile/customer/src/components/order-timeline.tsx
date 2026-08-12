import { View, Text, StyleSheet } from 'react-native';

const DELIVERY_STEPS = [
  { key: 'PENDING', label: 'Order Confirmed', emoji: '✓' },
  { key: 'ACCEPTED', label: 'Accepted', emoji: '✅' },
  { key: 'PREPARING', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'READY', label: 'Ready', emoji: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', emoji: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '✓' },
];

const TAKEAWAY_STEPS = [
  { key: 'PENDING', label: 'Order Confirmed', emoji: '✓' },
  { key: 'ACCEPTED', label: 'Accepted', emoji: '✅' },
  { key: 'PREPARING', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'READY', label: 'Ready for Pickup', emoji: '📦' },
  { key: 'DELIVERED', label: 'Collected', emoji: '✓' },
];

const DINE_IN_STEPS = [
  { key: 'PENDING', label: 'Order Confirmed', emoji: '✓' },
  { key: 'ACCEPTED', label: 'Accepted', emoji: '✅' },
  { key: 'PREPARING', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'READY', label: 'Ready', emoji: '🍽️' },
  { key: 'SERVED', label: 'Served', emoji: '✓' },
  { key: 'DELIVERED', label: 'Completed', emoji: '✓' },
];

function stepsForOrderType(orderType?: string) {
  if (orderType === 'TAKEAWAY' || orderType === 'ONLINE_PICKUP') return TAKEAWAY_STEPS;
  if (orderType === 'DINE_IN') return DINE_IN_STEPS;
  return DELIVERY_STEPS;
}

export function OrderTimeline({
  status,
  orderType,
  primary = '#14532D',
}: {
  status: string;
  orderType?: string;
  primary?: string;
}) {
  const steps = stepsForOrderType(orderType);
  let currentIdx = steps.findIndex((s) => s.key === status);
  // Map OUT_FOR_DELIVERY onto takeaway READY if needed
  if (currentIdx < 0 && status === 'SERVED') {
    currentIdx = steps.findIndex((s) => s.key === 'SERVED' || s.key === 'DELIVERED');
  }
  if (currentIdx < 0) {
    currentIdx = steps.findIndex((s) => s.key === 'PREPARING');
  }

  return (
    <View style={styles.wrap}>
      {steps.map((step, idx) => {
        const done = currentIdx >= 0 && idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <View key={`${step.key}-${idx}`} style={styles.row}>
            <View style={styles.left}>
              <View
                style={[
                  styles.dot,
                  done ? { backgroundColor: primary } : styles.dotPending,
                  active && styles.dotActive,
                ]}
              >
                <Text style={[styles.emoji, done && styles.emojiDone]}>{step.emoji}</Text>
              </View>
              {idx < steps.length - 1 ? (
                <View style={[styles.line, done && { backgroundColor: primary }]} />
              ) : null}
            </View>
            <View style={styles.labelWrap}>
              <Text style={[styles.label, done && { color: primary, fontWeight: '700' }]}>
                {step.label}
              </Text>
              {active ? <Text style={styles.activeHint}>In progress</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 56 },
  left: { alignItems: 'center', width: 40 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPending: { backgroundColor: '#E5E7EB' },
  dotActive: { borderWidth: 2, borderColor: '#F59E0B' },
  emoji: { fontSize: 13 },
  emojiDone: { color: '#fff' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 18 },
  labelWrap: { flex: 1, paddingTop: 6 },
  label: { color: '#6B7280', fontSize: 14 },
  activeHint: { color: '#F59E0B', fontSize: 11, fontWeight: '700', marginTop: 2 },
});
