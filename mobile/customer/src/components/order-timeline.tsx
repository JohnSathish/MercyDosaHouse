import { View, Text, StyleSheet } from 'react-native';

const STEPS = [
  { key: 'PENDING', label: 'Order Received', emoji: '📋' },
  { key: 'ACCEPTED', label: 'Accepted', emoji: '✅' },
  { key: 'PREPARING', label: 'Preparing', emoji: '👨‍🍳' },
  { key: 'READY', label: 'Ready', emoji: '🍽️' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', emoji: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '🎉' },
];

export function OrderTimeline({
  status,
  primary = '#14532D',
}: {
  status: string;
  primary?: string;
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.left}>
              <View
                style={[
                  styles.dot,
                  done ? { backgroundColor: primary } : styles.dotPending,
                  active && styles.dotActive,
                ]}
              >
                <Text style={styles.emoji}>{step.emoji}</Text>
              </View>
              {idx < STEPS.length - 1 ? (
                <View style={[styles.line, done && { backgroundColor: primary }]} />
              ) : null}
            </View>
            <Text style={[styles.label, done && { color: primary, fontWeight: '700' }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 52 },
  left: { alignItems: 'center', width: 40 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPending: { backgroundColor: '#E5E7EB' },
  dotActive: { borderWidth: 2, borderColor: '#F59E0B' },
  emoji: { fontSize: 14 },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 16 },
  label: { flex: 1, paddingTop: 6, color: '#6B7280', fontSize: 14 },
});
