import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { theme, formatInr } from './theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={[styles.kpi, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null]}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export function StatusChip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warn' | 'danger' | 'info' | 'neutral';
}) {
  const bg =
    tone === 'success'
      ? '#DCFCE7'
      : tone === 'warn'
        ? '#FEF3C7'
        : tone === 'danger'
          ? '#FEE2E2'
          : tone === 'info'
            ? '#DBEAFE'
            : '#F3F4F6';
  const fg =
    tone === 'success'
      ? '#166534'
      : tone === 'warn'
        ? '#92400E'
        : tone === 'danger'
          ? '#991B1B'
          : tone === 'info'
            ? '#1E40AF'
            : '#374151';
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  style?: ViewStyle;
}) {
  const bg =
    variant === 'secondary'
      ? theme.colors.secondary
      : variant === 'danger'
        ? theme.colors.danger
        : variant === 'ghost'
          ? 'transparent'
          : theme.colors.primary;
  const color = variant === 'ghost' ? theme.colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled || loading ? 0.55 : pressed ? 0.9 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: theme.colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.btnText, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function EmptyState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {onRetry ? <PrimaryButton title="Retry" onPress={onRetry} style={{ marginTop: 12 }} /> : null}
    </View>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function Money({ value, style }: { value: number; style?: TextStyle }) {
  return (
    <Text style={[{ fontWeight: '700', color: theme.colors.text }, style]}>{formatInr(value)}</Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    gap: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  kpi: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    padding: 12,
    ...theme.shadow.card,
  },
  kpiValue: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
  kpiLabel: { fontSize: 11, color: theme.colors.muted, marginTop: 4, textTransform: 'uppercase' },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontWeight: '700' },
  btn: {
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontWeight: '700', fontSize: 14 },
  empty: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  emptyMsg: { marginTop: 6, color: theme.colors.muted, textAlign: 'center' },
});
