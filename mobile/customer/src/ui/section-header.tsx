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
  compact,
}: {
  icon?: string | null;
  label: string;
  active?: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        compact && styles.chipCompact,
        active && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          compact && styles.iconCircleCompact,
          active && { backgroundColor: 'rgba(255,255,255,0.2)' },
          !active && compact ? { borderWidth: 1.5, borderColor: COLORS.border } : null,
        ]}
      >
        <Text style={[styles.icon, compact && styles.iconCompact]}>{icon ?? '🍽️'}</Text>
      </View>
      <Text
        style={[styles.chipLabel, compact && styles.chipLabelCompact, active && { color: '#fff' }]}
        numberOfLines={1}
      >
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
  chipCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 60,
    marginRight: 6,
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
  iconCircleCompact: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    marginBottom: 4,
  },
  icon: { fontSize: 22 },
  iconCompact: { fontSize: 22 },
  chipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    maxWidth: 64,
    textAlign: 'center',
  },
  chipLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 72,
  },
});
