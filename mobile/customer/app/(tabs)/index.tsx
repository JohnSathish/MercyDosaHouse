import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { HomeSectionList } from '@/components/home-section-list';
import { useAppConfig } from '@/providers/config-context';

export default function HomeScreen() {
  const config = useAppConfig();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to</Text>
        <Text style={styles.title}>{config.branding.appName}</Text>
      </View>
      <HomeSectionList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  greeting: { color: '#6B7280', fontSize: 13 },
  title: { color: '#14532D', fontSize: 22, fontWeight: '800' },
});
