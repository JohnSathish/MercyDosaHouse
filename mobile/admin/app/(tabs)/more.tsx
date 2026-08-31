import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { canManageDelivery, canManageMenu, canUseKds, canUsePos, roleLabel } from '@/lib/roles';
import { AppHeader, Card, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const modules = [
    ['Kitchen Display', '/kds', canUseKds(user)],
    ['Categories', '/categories', canManageMenu(user)],
    ['Customers', '/customers', true],
    ['Delivery', '/delivery', canManageDelivery(user)],
    ['Inventory', '/inventory', canManageMenu(user)],
    ['Offers', '/offers', canManageMenu(user)],
    ['Announcements', '/announcements', canManageMenu(user)],
    ['Mobile App Config', '/mobile-config', canManageMenu(user)],
    ['Website CMS', '/cms', canManageMenu(user)],
    ['Reports', '/reports', true],
    ['Billing & Invoices', '/invoices', true],
    ['Order Emails', '/emails', canManageMenu(user)],
    ['Notifications', '/notification-settings', true],
    ['Settings', '/settings', canManageMenu(user)],
    ['Full POS', '/pos', canUsePos(user)],
  ].filter((x) => x[2]);
  return (
    <Screen>
      <AppHeader
        title="More"
        subtitle={`${(user as any)?.name ?? (user as any)?.email ?? 'Staff'} · ${roleLabel(user)}`}
      />
      <FlatList
        data={modules}
        numColumns={2}
        keyExtractor={(x: any) => x[1]}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.profile}>
            <Text style={styles.avatar}>
              {String((user as any)?.name ?? 'M')
                .slice(0, 1)
                .toUpperCase()}
            </Text>
            <View>
              <Text style={styles.name}>{(user as any)?.name ?? 'Mercy Dosa House Staff'}</Text>
              <Text style={styles.muted}>{(user as any)?.email ?? roleLabel(user)}</Text>
            </View>
          </View>
        }
        renderItem={({ item }: any) => (
          <Card style={styles.tile} onPress={() => router.push(item[1] as any)}>
            <Text style={styles.icon}>›</Text>
            <Text style={styles.tileText}>{item[0]}</Text>
          </Card>
        )}
        ListFooterComponent={
          <PrimaryButton
            title="Log Out"
            variant="danger"
            onPress={() => logout()}
            style={{ marginTop: 18 }}
          />
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 40 },
  row: { gap: 10 },
  profile: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, marginBottom: 8 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    textAlign: 'center',
    lineHeight: 50,
    backgroundColor: theme.colors.secondary,
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  name: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  muted: { color: theme.colors.muted, marginTop: 3 },
  tile: { flex: 1, marginBottom: 10, minHeight: 95, justifyContent: 'space-between' },
  icon: { fontSize: 24, color: theme.colors.secondary, fontWeight: '900' },
  tileText: { fontWeight: '800', color: theme.colors.primary },
});
