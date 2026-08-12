import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/ui/theme';

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
