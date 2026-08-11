import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useBootstrap } from '@/providers/bootstrap-context';

/** Entry route — wait for bootstrap, then redirect. */
export default function IndexScreen() {
  const { phase, initialHref } = useBootstrap();

  if (phase === 'loading' || !initialHref) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#14532D" size="large" />
      </View>
    );
  }

  return (
    <Redirect
      href={initialHref as '/(tabs)' | '/(auth)/login' | '/maintenance' | '/force-update'}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7E6',
  },
});
