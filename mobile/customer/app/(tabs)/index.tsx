import { StyleSheet, View } from 'react-native';
import { HomeSectionList } from '@/components/home-section-list';
import { AppHeader } from '@/ui';
import { COLORS } from '@/ui/theme';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <AppHeader locationLabel="Walbakgre & nearby" />
      <HomeSectionList />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});
