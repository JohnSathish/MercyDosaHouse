import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useBootstrap } from '@/providers/bootstrap-context';

/** Entry route — Stack is always mounted before redirect. */
export default function IndexScreen() {
  const { phase, initialHref } = useBootstrap();

  if (phase !== 'ready' || !initialHref) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#14532D" />
      </View>
    );
  }

  return <Redirect href={initialHref} />;
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7E6',
  },
});
