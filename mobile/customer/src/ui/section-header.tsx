import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from './theme';
import { useThemeColors } from '@/providers/config-context';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: colors.secondary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CategoryChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon?: string | null;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    >
      <View style={[styles.iconCircle, active && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={styles.icon}>{icon ?? '🍽️'}</Text>
      </View>
      <Text style={[styles.chipLabel, active && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '800' },
  action: { fontSize: 13, fontWeight: '700' },
  chip: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 72,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: { fontSize: 22 },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 64,
    textAlign: 'center',
  },
});
