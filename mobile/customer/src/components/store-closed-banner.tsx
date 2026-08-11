import { View, Text, StyleSheet } from 'react-native';
import {
  DEFAULT_STORE_CLOSED_CUSTOMER_BODY,
  DEFAULT_STORE_CLOSED_CUSTOMER_HEADLINE,
} from '@mdh/types';
import { useAppConfig } from '@/providers/config-context';

export function StoreClosedBanner() {
  const config = useAppConfig();
  const open = config.store.storeOpen !== false;

  if (open) return null;

  const body = config.store.storeClosedMessage?.trim() || DEFAULT_STORE_CLOSED_CUSTOMER_BODY;
  const reopen = config.store.storeReopenMessage?.trim();

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>🔴 {DEFAULT_STORE_CLOSED_CUSTOMER_HEADLINE}</Text>
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
