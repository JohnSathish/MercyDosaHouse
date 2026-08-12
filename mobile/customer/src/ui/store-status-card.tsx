import { StyleSheet, Text, View } from 'react-native';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { STORE_CLOSED_BODY, STORE_CLOSED_HEADLINE } from '@/lib/mobile-messages';
import { COLORS, RADIUS, SHADOW } from './theme';

export function StoreStatusCard() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const open = config.store.storeOpen !== false;

  if (open) {
    return (
      <View style={[styles.card, styles.openCard]}>
        <Text style={styles.openTitle}>🟢 We're Open</Text>
        <Text style={styles.openBody}>Accepting orders now.</Text>
      </View>
    );
  }

  const body = config.store.storeClosedMessage?.trim() || STORE_CLOSED_BODY;
  const reopen = config.store.storeReopenMessage?.trim();

  return (
    <View style={[styles.card, styles.closedCard]}>
      <Text style={styles.closedTitle}>🔴 {STORE_CLOSED_HEADLINE}</Text>
      <Text style={styles.closedBody}>{body}</Text>
      {reopen ? <Text style={[styles.reopen, { color: colors.secondary }]}>{reopen}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...SHADOW.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  openCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.25)',
  },
  openTitle: { color: COLORS.success, fontWeight: '800', fontSize: 14 },
  openBody: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  closedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.2)',
  },
  closedTitle: { color: COLORS.danger, fontWeight: '800', fontSize: 14 },
  closedBody: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  reopen: { fontWeight: '700', fontSize: 12, marginTop: 6 },
});
