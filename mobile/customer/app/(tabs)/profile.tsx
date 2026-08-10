import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { logout } from '@/lib/auth-api';
import { getStoredUser } from '@/lib/auth-storage';
import type { AuthUser } from '@mdh/types';
import { SupportLinks } from '@/components/support-links';
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

  useEffect(() => {
    void getStoredUser().then(setUser);
  }, []);

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

        <View style={styles.card}>
          <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
          <Text style={styles.meta}>{user?.phone ?? 'Not signed in'}</Text>
        </View>

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
                <MenuLink
                  icon="⭐"
                  label="Loyalty Rewards"
                  onPress={() => router.push('/loyalty')}
                />
              ) : null}
              {notificationsEnabled ? (
                <MenuLink
                  icon="🔔"
                  label="Notifications"
                  onPress={() => router.push('/notifications')}
                />
              ) : null}
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
});
