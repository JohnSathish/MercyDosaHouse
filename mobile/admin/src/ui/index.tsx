import { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolvePublicMediaUrl } from '@mdh/utils';
import { WEBSITE_URL } from '@/lib/constants';
import { theme, formatInr } from './theme';

const BUNDLED_BRAND_LOGO = require('../../assets/logo.png');

function BrandMark() {
  const [useBundled, setUseBundled] = useState(false);
  const uri = resolvePublicMediaUrl('/images/logo.png', WEBSITE_URL);
  return (
    <View style={styles.brandMark}>
      <Image
        source={useBundled || !uri ? BUNDLED_BRAND_LOGO : { uri }}
        defaultSource={BUNDLED_BRAND_LOGO}
        onError={() => setUseBundled(true)}
        style={styles.brandMarkImage}
        resizeMode="contain"
      />
    </View>
  );
}

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
  left,
  statusLine,
  onMenuPress,
  notificationCount,
  onNotificationsPress,
  periodLabel = 'Today',
  onPeriodPress,
  showBrandMark,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  statusLine?: string;
  onMenuPress?: () => void;
  notificationCount?: number;
  onNotificationsPress?: () => void;
  periodLabel?: string;
  onPeriodPress?: () => void;
  showBrandMark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const topPad = Math.max(insets.top, statusBarHeight, 28) + 10;

  const trailing =
    right ??
    (onNotificationsPress || onPeriodPress ? (
      <View style={styles.headerActions}>
        {onNotificationsPress ? (
          <Pressable style={styles.headerIconBtn} onPress={onNotificationsPress} hitSlop={8}>
            <Text style={styles.headerIcon}>🔔</Text>
            {(notificationCount ?? 0) > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {(notificationCount ?? 0) > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        {onPeriodPress ? (
          <Pressable style={styles.periodChip} onPress={onPeriodPress}>
            <Text style={styles.periodText}>📅 {periodLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    ) : null);

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      {left ??
        (onMenuPress ? (
          <Pressable style={styles.headerIconBtn} onPress={onMenuPress} hitSlop={8}>
            <Text style={styles.headerIcon}>☰</Text>
          </Pressable>
        ) : null)}
      {showBrandMark ? <BrandMark /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {statusLine ? (
          <View style={styles.statusLine}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLineText} numberOfLines={1}>
              {statusLine}
            </Text>
          </View>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function KpiCard({
  label,
  value,
  accent,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: string;
  icon?: string;
  hint?: string;
}) {
  return (
    <View style={[styles.kpi, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null]}>
      {icon ? (
        <View style={[styles.kpiIconWrap, accent ? { backgroundColor: `${accent}22` } : null]}>
          <Text style={styles.kpiIcon}>{icon}</Text>
        </View>
      ) : null}
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
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
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    gap: 10,
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontSize: 11.5, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  periodChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  periodText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandMarkImage: { width: 36, height: 36 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusLineText: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '600', flex: 1 },
  kpi: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '32%',
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    padding: 11,
    ...theme.shadow.card,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiIcon: { fontSize: 13 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  kpiLabel: { fontSize: 10, color: theme.colors.muted, marginTop: 3, fontWeight: '700' },
  kpiHint: { fontSize: 10, color: theme.colors.muted, marginTop: 3 },
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
