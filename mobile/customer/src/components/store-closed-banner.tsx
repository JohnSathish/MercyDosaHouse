import { View, Text, StyleSheet } from 'react-native';
import { STORE_CLOSED_BODY, STORE_CLOSED_HEADLINE } from '@/lib/mobile-messages';
import { useBootstrap } from '@/providers/bootstrap-context';

export function StoreClosedBanner() {
  const { phase, config } = useBootstrap();
  if (phase !== 'ready') return null;

  const open = config.store.storeOpen !== false;
  if (open) return null;

  const body = config.store.storeClosedMessage?.trim() || STORE_CLOSED_BODY;
  const reopen = config.store.storeReopenMessage?.trim();

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>🔴 {STORE_CLOSED_HEADLINE}</Text>
      <Text style={styles.body}>{body}</Text>
      {reopen ? <Text style={styles.reopen}>{reopen}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#991B1B',
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.95)', fontSize: 12, textAlign: 'center', marginTop: 4 },
  reopen: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
});
