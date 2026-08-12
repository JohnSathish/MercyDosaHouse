import { StyleSheet, Text, View } from 'react-native';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { STORE_CLOSED_BODY, STORE_CLOSED_HEADLINE } from '@/lib/mobile-messages';
import { COLORS, RADIUS } from './theme';

/** Slim open/closed status — keeps food above the fold. */
export function StoreStatusCard() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const open = config.store.storeOpen !== false;

  if (open) {
    return (
      <View style={[styles.line, styles.openLine]}>
        <View style={styles.dot} />
        <Text style={styles.openText}>
          We&apos;re Open <Text style={styles.sep}>•</Text> Accepting orders now
        </Text>
      </View>
    );
  }

  const body = config.store.storeClosedMessage?.trim() || STORE_CLOSED_BODY;
  const reopen = config.store.storeReopenMessage?.trim();

  return (
    <View style={[styles.closedCard, { borderColor: 'rgba(185,28,28,0.22)' }]}>
      <Text style={styles.closedTitle}>🔴 {STORE_CLOSED_HEADLINE}</Text>
      <Text style={styles.closedBody}>{body}</Text>
      {reopen ? <Text style={[styles.reopen, { color: colors.secondary }]}>{reopen}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    marginHorizontal: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  openLine: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  openText: { flex: 1, color: '#065F46', fontWeight: '700', fontSize: 12.5 },
  sep: { color: '#6EE7B7', fontWeight: '800' },
  closedCard: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  closedTitle: { color: COLORS.danger, fontWeight: '800', fontSize: 13 },
  closedBody: { color: COLORS.textMuted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  reopen: { fontWeight: '700', fontSize: 12, marginTop: 5 },
});
