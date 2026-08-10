import { shouldForceUpdate } from '@mdh/mobile-shared';
import type { MobileAppConfigDto } from '@mdh/types';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION } from '@/lib/constants';
import { getConfigStore } from '@/lib/config-store';
import { isAuthenticated } from '@/lib/auth-storage';
import { AppProviders } from '@/providers/app-providers';
import { ConfigProvider } from '@/providers/config-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function BootstrapGate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<MobileAppConfigDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const routed = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const store = getConfigStore();
        const remoteConfig = await store.bootstrap();
        if (!mounted) return;

        setConfig(remoteConfig);
        await SplashScreen.hideAsync();

        if (routed.current) return;
        routed.current = true;

        if (remoteConfig.maintenance.maintenanceMode) {
          router.replace('/maintenance');
          return;
        }
        if (shouldForceUpdate(APP_VERSION, remoteConfig)) {
          router.replace('/force-update');
          return;
        }

        const authed = await isAuthenticated();
        router.replace(authed ? '/(tabs)' : '/(auth)/login');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load config');
        await SplashScreen.hideAsync();
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could not connect</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Text style={styles.hint}>Ensure API is running at port 3001</Text>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={[styles.center, { backgroundColor: '#14532D' }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Mercy Dosa House</Text>
        <Text style={styles.loadingSub}>Crispy Dosas. Happy Hearts.</Text>
      </View>
    );
  }

  return (
    <ConfigProvider config={config} store={getConfigStore()}>
      {children}
    </ConfigProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <BootstrapGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="order/success" />
          <Stack.Screen name="track/[orderNumber]" />
          <Stack.Screen name="addresses/index" />
          <Stack.Screen name="addresses/new" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="loyalty" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="search" />
          <Stack.Screen name="maintenance" options={{ gestureEnabled: false }} />
          <Stack.Screen name="force-update" options={{ gestureEnabled: false }} />
        </Stack>
      </BootstrapGate>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF7E6',
  },
  loadingText: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16 },
  loadingSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#14532D' },
  errorBody: { color: '#6B7280', marginTop: 8, textAlign: 'center' },
  hint: { color: '#9CA3AF', fontSize: 12, marginTop: 12 },
});
