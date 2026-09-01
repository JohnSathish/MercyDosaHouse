import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { theme } from '@/ui/theme';
import { useAdminPushRegistration } from '@/hooks/use-admin-push';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  initialRouteName: 'index',
};

function StartupOverlay({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Text style={styles.brand}>Mercy Dosa House</Text>
      <Text style={styles.tag}>Admin Control Center</Text>
      <ActivityIndicator color="#fff" size="large" style={{ marginTop: 20 }} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function AuthGate() {
  const { user, loading, error, retry } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const splashHidden = useRef(false);
  const [forceReady, setForceReady] = useState(false);
  useAdminPushRegistration(!!user && !loading);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashHidden.current) {
        splashHidden.current = true;
        void SplashScreen.hideAsync().catch(() => undefined);
      }
      setForceReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const navReady = Boolean(navigationState?.key) || forceReady;

  useEffect(() => {
    if (loading || !navReady) return;

    const group = String(segments[0] ?? '');
    const inAuth = group === '(auth)' || group === 'login';
    const atIndex = !group || group === 'index';

    try {
      if (!user && !inAuth) {
        router.replace('/(auth)/login');
      } else if (user && (inAuth || atIndex)) {
        router.replace('/(tabs)');
      }
    } catch {
      /* Navigator not ready yet — effect reruns when state updates. */
    }

    if (!splashHidden.current) {
      splashHidden.current = true;
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [user, loading, segments, router, navReady]);

  const showOverlay = loading || !navReady;
  const message = error
    ? 'Could not restore your session. Opening sign-in…'
    : loading
      ? 'Restoring your session…'
      : 'Loading dashboard…';

  return (
    <>
      <StartupOverlay visible={showOverlay} message={message} />
      {error && !loading && !user ? (
        <View style={styles.retryBar}>
          <Text style={styles.retryText}>{error}</Text>
          <Text style={styles.retryAction} onPress={() => void retry()}>
            Retry
          </Text>
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary>
        <AppProviders>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="orders/[id]"
                options={{ presentation: 'modal', headerShown: true, title: 'Order' }}
              />
              <Stack.Screen
                name="kds/index"
                options={{ headerShown: true, title: 'Kitchen Display' }}
              />
              <Stack.Screen name="menu/[id]" options={{ headerShown: true, title: 'Edit Item' }} />
              <Stack.Screen name="menu/new" options={{ headerShown: true, title: 'Add Item' }} />
              <Stack.Screen
                name="categories/index"
                options={{ headerShown: true, title: 'Categories' }}
              />
              <Stack.Screen
                name="customers/index"
                options={{ headerShown: true, title: 'Customers' }}
              />
              <Stack.Screen
                name="customers/[id]"
                options={{ headerShown: true, title: 'Customer' }}
              />
              <Stack.Screen
                name="delivery/index"
                options={{ headerShown: true, title: 'Delivery' }}
              />
              <Stack.Screen
                name="inventory/index"
                options={{ headerShown: true, title: 'Inventory' }}
              />
              <Stack.Screen
                name="inventory/items"
                options={{ headerShown: true, title: 'Ingredients' }}
              />
              <Stack.Screen
                name="inventory/item-form"
                options={{ headerShown: true, title: 'Ingredient' }}
              />
              <Stack.Screen
                name="inventory/purchase-orders"
                options={{ headerShown: true, title: 'Purchase Orders' }}
              />
              <Stack.Screen
                name="inventory/adjust"
                options={{ headerShown: true, title: 'Adjust Stock' }}
              />
              <Stack.Screen
                name="inventory/suppliers"
                options={{ headerShown: true, title: 'Suppliers' }}
              />
              <Stack.Screen
                name="inventory/waste"
                options={{ headerShown: true, title: 'Waste' }}
              />
              <Stack.Screen
                name="inventory/low-stock"
                options={{ headerShown: true, title: 'Low Stock' }}
              />
              <Stack.Screen
                name="inventory/expiry"
                options={{ headerShown: true, title: 'Expiry' }}
              />
              <Stack.Screen
                name="inventory/reports"
                options={{ headerShown: true, title: 'Inventory Reports' }}
              />
              <Stack.Screen
                name="offers/index"
                options={{ headerShown: true, title: 'Offers & Coupons' }}
              />
              <Stack.Screen
                name="announcements/index"
                options={{ headerShown: true, title: 'Announcements' }}
              />
              <Stack.Screen
                name="mobile-config/index"
                options={{ headerShown: true, title: 'Mobile Config' }}
              />
              <Stack.Screen
                name="cms/index"
                options={{ headerShown: true, title: 'Website CMS' }}
              />
              <Stack.Screen
                name="reports/index"
                options={{ headerShown: true, title: 'Reports' }}
              />
              <Stack.Screen
                name="invoices/index"
                options={{ headerShown: true, title: 'Invoices' }}
              />
              <Stack.Screen
                name="invoices/new"
                options={{ headerShown: true, title: 'New Invoice' }}
              />
              <Stack.Screen
                name="invoices/[id]"
                options={{ headerShown: true, title: 'Invoice' }}
              />
              <Stack.Screen
                name="emails/index"
                options={{ headerShown: true, title: 'Order Emails' }}
              />
              <Stack.Screen
                name="settings/index"
                options={{ headerShown: true, title: 'Settings' }}
              />
              <Stack.Screen
                name="notifications/index"
                options={{ headerShown: true, title: 'Notifications' }}
              />
              <Stack.Screen
                name="notification-settings/index"
                options={{ headerShown: true, title: 'Notification settings' }}
              />
              <Stack.Screen name="pos/index" options={{ headerShown: true, title: 'POS' }} />
            </Stack>
            <AuthGate />
          </View>
        </AppProviders>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.primary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },
  brand: { color: '#fff', fontSize: 24, fontWeight: '800' },
  tag: { color: theme.colors.secondary, marginTop: 6, fontWeight: '700' },
  message: { color: 'rgba(255,255,255,0.8)', marginTop: 12, fontSize: 13 },
  retryBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 12,
    zIndex: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryText: { color: '#fff', flex: 1, fontSize: 12 },
  retryAction: { color: theme.colors.secondary, fontWeight: '800' },
});
