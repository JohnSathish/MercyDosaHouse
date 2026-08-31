import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { AppProviders } from '@/providers/app-providers';
import { BootstrapProvider, useBootstrap } from '@/providers/bootstrap-context';
import { resetConfigStore } from '@/lib/config-store';
import { StoreClosedBanner } from '@/components/store-closed-banner';
import { RemoteSplashOverlay } from '@/components/remote-splash-overlay';
import { useCustomerPush } from '@/hooks/use-customer-push';

function OfflineBanner() {
  const { offline, retry } = useBootstrap();
  if (!offline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>Limited connectivity — showing saved settings</Text>
      <Pressable onPress={() => void retry()}>
        <Text style={styles.offlineRetry}>Retry</Text>
      </Pressable>
    </View>
  );
}

function BootstrapShell({ children }: { children: React.ReactNode }) {
  const { phase, error, retry } = useBootstrap();
  const [showSplash, setShowSplash] = useState(true);
  useCustomerPush();

  useEffect(() => {
    if (phase !== 'ready') {
      setShowSplash(true);
      return;
    }
    const t = setTimeout(() => setShowSplash(false), 420);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <View style={styles.appRoot}>
      {phase === 'ready' && error ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Using offline defaults — {error}</Text>
          <Pressable onPress={() => void retry()}>
            <Text style={styles.offlineRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <OfflineBanner />
      )}
      <StoreClosedBanner />
      {children}
      {/* Mounted last so it always paints above the navigator on Android */}
      {showSplash ? <RemoteSplashOverlay /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <AppProviders>
        <BootstrapProvider>
          <BootstrapShell>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
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
              <Stack.Screen name="feedback" />
              <Stack.Screen name="invoices" />
              <Stack.Screen name="search" />
              <Stack.Screen name="maintenance" options={{ gestureEnabled: false }} />
              <Stack.Screen name="force-update" options={{ gestureEnabled: false }} />
            </Stack>
          </BootstrapShell>
        </BootstrapProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

export { resetConfigStore };

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  appRoot: { flex: 1 },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomColor: '#F59E0B',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  offlineText: { flex: 1, color: '#92400E', fontSize: 12 },
  offlineRetry: { color: '#14532D', fontWeight: '700', fontSize: 12 },
});
