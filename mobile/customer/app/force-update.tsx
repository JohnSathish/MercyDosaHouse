import { StyleSheet, Text, View } from 'react-native';
import { useAppConfig } from '@/providers/config-context';

export default function ForceUpdateScreen() {
  const config = useAppConfig();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📲</Text>
      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.body}>
        {config.versionControl.softUpdateMessage ??
          'Please update Mercy Dosa House to the latest version to continue.'}
      </Text>
      <Text style={styles.version}>Minimum version: {config.versionControl.minAppVersion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFF7E6',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: '#14532D', fontSize: 24, fontWeight: '800' },
  body: { color: '#6B7280', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  version: { color: '#9CA3AF', marginTop: 16, fontSize: 13 },
});
