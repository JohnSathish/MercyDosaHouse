import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';
import { theme } from '@/ui/theme';
import { useAdminPushRegistration } from '@/hooks/use-admin-push';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useAdminPushRegistration(!!user);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary,
        }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const RootStack = Stack as any;
  return (
    <AppProviders>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AuthGate>
        <RootStack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <RootStack.Screen name="(auth)/login" />
          <RootStack.Screen name="(tabs)" />
          <RootStack.Screen
            name="orders/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'Order' }}
          />
          <RootStack.Screen
            name="kds/index"
            options={{ headerShown: true, title: 'Kitchen Display' }}
          />
          <RootStack.Screen name="menu/[id]" options={{ headerShown: true, title: 'Edit Item' }} />
          <RootStack.Screen name="menu/new" options={{ headerShown: true, title: 'Add Item' }} />
          <RootStack.Screen
            name="categories/index"
            options={{ headerShown: true, title: 'Categories' }}
          />
          <RootStack.Screen
            name="customers/index"
            options={{ headerShown: true, title: 'Customers' }}
          />
          <RootStack.Screen
            name="customers/[id]"
            options={{ headerShown: true, title: 'Customer' }}
          />
          <RootStack.Screen
            name="delivery/index"
            options={{ headerShown: true, title: 'Delivery' }}
          />
          <RootStack.Screen
            name="inventory/index"
            options={{ headerShown: true, title: 'Inventory' }}
          />
          <RootStack.Screen
            name="offers/index"
            options={{ headerShown: true, title: 'Offers & Coupons' }}
          />
          <RootStack.Screen
            name="announcements/index"
            options={{ headerShown: true, title: 'Announcements' }}
          />
          <RootStack.Screen
            name="mobile-config/index"
            options={{ headerShown: true, title: 'Mobile Config' }}
          />
          <RootStack.Screen
            name="cms/index"
            options={{ headerShown: true, title: 'Website CMS' }}
          />
          <RootStack.Screen
            name="reports/index"
            options={{ headerShown: true, title: 'Reports' }}
          />
          <RootStack.Screen
            name="emails/index"
            options={{ headerShown: true, title: 'Order Emails' }}
          />
          <RootStack.Screen
            name="settings/index"
            options={{ headerShown: true, title: 'Settings' }}
          />
          <RootStack.Screen name="pos/index" options={{ headerShown: true, title: 'POS' }} />
        </RootStack>
      </AuthGate>
    </AppProviders>
  );
}
