import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppProviders } from '@/providers/app-providers';
import { BootstrapProvider, useBootstrap } from '@/providers/bootstrap-context';
import { resetConfigStore } from '@/lib/config-store';
import { StoreClosedBanner } from '@/components/store-closed-banner';

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

  return (
    <View style={styles.appRoot}>
      {phase === 'loading' ? (
        <View style={styles.bootOverlay}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Mercy Dosa House</Text>
          <Text style={styles.loadingSub}>Crispy Dosas. Happy Hearts.</Text>
        </View>
      ) : null}
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
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <BootstrapProvider>
        <BootstrapShell>
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
        </BootstrapShell>
      </BootstrapProvider>
    </AppProviders>
  );
}

export { resetConfigStore };

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14532D',
    zIndex: 10,
  },
  loadingText: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16 },
  loadingSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4 },
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
