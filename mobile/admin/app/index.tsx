import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { theme } from '@/ui/theme';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.label}>Starting Admin…</Text>
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { color: 'rgba(255,255,255,0.85)', marginTop: 12, fontWeight: '600' },
});
