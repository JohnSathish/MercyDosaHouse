import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/providers/config-context';

export default function OrderSuccessScreen() {
  const { order } = useLocalSearchParams<{ order: string }>();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.title, { color: colors.primary }]}>Order Placed!</Text>
        <Text style={styles.subtitle}>Thank you for ordering from Mercy Dosa House.</Text>
        {order ? (
          <View style={styles.orderBox}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>{order}</Text>
          </View>
        ) : null}
        <Text style={styles.hint}>We'll start preparing your dosas right away.</Text>
      </View>

      <View style={styles.actions}>
        {order ? (
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace(`/track/${encodeURIComponent(order)}`)}
          >
            <Text style={styles.btnTextLight}>Track Order</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.btn, styles.btnOutline, { borderColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.btnTextDark, { color: colors.primary }]}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#6B7280', marginTop: 8, textAlign: 'center' },
  orderBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  orderLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  orderNumber: {
    color: '#14532D',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  hint: { color: '#6B7280', fontSize: 14, marginTop: 16, textAlign: 'center' },
  actions: { padding: 16, gap: 10 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5 },
  btnTextLight: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnTextDark: { fontWeight: '700', fontSize: 16 },
});
