import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION } from '@/lib/constants';
import { useAppConfig, useThemeColors } from '@/providers/config-context';

export default function SettingsScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>App</Text>
          <Row label="App Name" value={config.branding.appName} />
          <Row label="Version" value={APP_VERSION} />
          <Row label="Config Version" value={`v${config.configVersion}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Delivery</Text>
          <Row label="Delivery Charge" value={`₹${config.delivery.deliveryCharge}`} />
          <Row label="Free Delivery Above" value={`₹${config.delivery.freeDeliveryLimit ?? 299}`} />
          <Row label="Min Order" value={`₹${config.delivery.minOrderAmount ?? 100}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Pre-Order</Text>
          <Row label="Discount" value={`${config.delivery.preOrderDiscountPct}%`} />
          <Row label="Min Days Ahead" value={`${config.delivery.preOrderMinDaysAhead} day(s)`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: { fontWeight: '700', color: '#14532D', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { color: '#6B7280', fontSize: 14 },
  rowValue: { color: '#1F2937', fontWeight: '600', fontSize: 14 },
});
