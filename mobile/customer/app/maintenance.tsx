import { StyleSheet, Text, View } from 'react-native';
import { useAppConfig } from '@/providers/config-context';

export default function MaintenanceScreen() {
  const config = useAppConfig();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔧</Text>
      <Text style={styles.title}>Under Maintenance</Text>
      <Text style={styles.body}>
        {config.maintenance.maintenanceMessage ??
          'We are temporarily unavailable. Please check back soon.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#14532D',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  body: { color: 'rgba(255,255,255,0.85)', marginTop: 12, textAlign: 'center', lineHeight: 22 },
});
