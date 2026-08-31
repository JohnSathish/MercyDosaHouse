import { type Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { logout } from '@/lib/auth-api';
import { getStoredUser } from '@/lib/auth-storage';
import type { AuthUser, LoyaltyMeDto } from '@mdh/types';
import { SupportLinks } from '@/components/support-links';
import { api } from '@/lib/api';
import { useAppConfig, useFeatureFlag, useThemeColors } from '@/providers/config-context';

function MenuLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const loyaltyEnabled = useFeatureFlag('loyalty');
  const wishlistEnabled = useFeatureFlag('wishlist');
  const notificationsEnabled = useFeatureFlag('push_notifications');
  const [user, setUser] = useState<AuthUser | null>(null);
  const { data: loyalty } = useQuery({
    queryKey: ['loyalty-me'],
    queryFn: () => api.get<LoyaltyMeDto>('/loyalty/me'),
    enabled: Boolean(user),
  });

  useFocusEffect(
    useCallback(() => {
      void getStoredUser().then(setUser);
    }, []),
  );

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Profile</Text>
        </View>

        {config.business.fssaiEnabled !== false && config.business.fssaiRegistrationNumber ? (
          <View style={styles.fssaiCard}>
            <Text style={styles.fssaiTitle}>🛡️ FSSAI Registered Food Business</Text>
            <Text style={styles.fssaiNumber}>
              Registration No. {config.business.fssaiRegistrationNumber}
            </Text>
            <Text style={styles.fssaiMeta}>
              {config.business.fssaiKindOfBusiness ?? 'Food Vending Establishment'}
            </Text>
            {config.business.fssaiCertificateUrl ? (
              <Pressable
                onPress={() => void Linking.openURL(config.business.fssaiCertificateUrl!)}
                style={styles.fssaiButton}
              >
                <Text style={styles.fssaiButtonText}>View registration certificate</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.name}>{user?.name?.trim() || user?.email || 'Guest'}</Text>
          <Text style={styles.meta}>
            {user ? user.phone || user.email || 'Signed in' : 'Not signed in'}
          </Text>
        </View>

        {user && loyaltyEnabled && loyalty?.account.enabled !== false ? (
          <Pressable style={styles.bronzeCard} onPress={() => router.push('/loyalty')}>
            <Text style={styles.bronzeTitle}>🪙 Bronze Coins</Text>
            <Text style={styles.bronzeCoins}>{loyalty?.account.available ?? 0} Coins</Text>
            <Text style={styles.bronzeWorth}>Worth ₹{loyalty?.account.valueAvailable ?? 0}</Text>
            <Text style={styles.bronzeHint}>Keep ordering & earn more rewards!</Text>
            <View style={styles.bronzeBtn}>
              <Text style={styles.bronzeBtnText}>View Rewards</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Account</Text>
          {user ? (
            <>
              <MenuLink
                icon="📍"
                label="Saved Addresses"
                onPress={() => router.push('/addresses')}
              />
              {wishlistEnabled ? (
                <MenuLink icon="❤️" label="Favorites" onPress={() => router.push('/favorites')} />
              ) : null}
              {loyaltyEnabled ? (
                <MenuLink icon="🪙" label="Bronze Coins" onPress={() => router.push('/loyalty')} />
              ) : null}
              {notificationsEnabled ? (
                <MenuLink
                  icon="🔔"
                  label="Notifications"
                  onPress={() => router.push('/notifications')}
                />
              ) : null}
              <MenuLink
                icon="⭐"
                label="My Feedback"
                onPress={() => router.push('/feedback' as Href)}
              />
              <MenuLink
                icon="🧾"
                label="Invoices"
                onPress={() => router.push('/invoices' as Href)}
              />
            </>
          ) : (
            <Pressable
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginText}>Login / Sign Up</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Support</Text>
          <SupportLinks />
          <MenuLink icon="❓" label="Help & FAQs" onPress={() => router.push('/help')} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>App</Text>
          <MenuLink icon="⚙️" label="Settings" onPress={() => router.push('/settings')} />
          <Text style={styles.meta}>Config v{config.configVersion}</Text>
        </View>

        {user ? (
          <Pressable
            style={[styles.logoutBtn, { borderColor: colors.primary }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: colors.primary }]}>Logout</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  meta: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  sectionLabel: { fontWeight: '700', color: '#14532D', marginBottom: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, color: '#374151', fontWeight: '600', fontSize: 15 },
  menuArrow: { color: '#9CA3AF', fontSize: 20 },
  loginBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loginText: { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { fontWeight: '700', fontSize: 16 },
  fssaiCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  fssaiTitle: { color: '#14532D', fontSize: 15, fontWeight: '800' },
  fssaiNumber: { color: '#166534', fontSize: 13, fontWeight: '700', marginTop: 6 },
  fssaiMeta: { color: '#4B5563', fontSize: 12, marginTop: 3 },
  fssaiButton: { alignSelf: 'flex-start', marginTop: 10 },
  fssaiButtonText: { color: '#14532D', fontSize: 13, fontWeight: '700' },
  bronzeCard: {
    backgroundColor: '#14532D',
    borderRadius: 16,
    marginBottom: 12,
    padding: 20,
    alignItems: 'center',
  },
  bronzeTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bronzeCoins: { color: '#FDE68A', fontSize: 32, fontWeight: '800', marginTop: 8 },
  bronzeWorth: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  bronzeHint: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 8 },
  bronzeBtn: {
    marginTop: 14,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  bronzeBtnText: { color: '#14532D', fontWeight: '800' },
});
