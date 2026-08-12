import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS } from './theme';

export function Skeleton({
  height = 16,
  width = '100%',
  radius = RADIUS.sm,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: object;
}) {
  return <View style={[styles.base, { height, width, borderRadius: radius }, style]} />;
}

export function FoodCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={96} width={96} radius={RADIUS.md} />
      <View style={styles.cardBody}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={12} width="50%" style={{ marginTop: 8 }} />
        <Skeleton height={14} width="30%" style={{ marginTop: 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: '#E5E7EB', overflow: 'hidden' },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  cardBody: { flex: 1, justifyContent: 'center' },
});
