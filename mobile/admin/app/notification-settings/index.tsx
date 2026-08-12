import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { api } from '@/lib/api';
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  loadOrderInbox,
  saveNotificationPrefs,
  type NotificationPrefs,
  type OrderAlertItem,
} from '@/lib/notification-prefs';
import { playNewOrderRingtone } from '@/lib/new-order-ringtone';
import { ensureNewOrdersChannel } from '@/hooks/use-admin-push';
import { Card, PrimaryButton, Screen, AppHeader } from '@/ui';
import { theme } from '@/ui/theme';
import { useAuth } from '@/providers/auth-provider';
import { canManageMenu } from '@/lib/roles';
import { useRouter } from 'expo-router';

const ROLE_OPTIONS = [
  { key: 'SUPER_ADMIN', label: 'Admin' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'KITCHEN_STAFF', label: 'Kitchen' },
  { key: 'CASHIER', label: 'Cashier' },
] as const;

type StaffPushConfig = {
  enabled: boolean;
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  recipientRoles: string[];
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [inbox, setInbox] = useState<OrderAlertItem[]>([]);
  const [permission, setPermission] = useState<string>('undetermined');

  const remote = useQuery({
    queryKey: ['staff-push-config'],
    queryFn: () => api.get<StaffPushConfig>('/notifications/staff-push-config'),
  });

  const refreshLocal = useCallback(async () => {
    setPrefs(await loadNotificationPrefs());
    setInbox(await loadOrderInbox());
    const perm = await Notifications.getPermissionsAsync();
    setPermission(perm.status);
  }, []);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal]);

  const persistPrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    await saveNotificationPrefs(next);
    await ensureNewOrdersChannel(next);
  };

  const saveRemote = useMutation({
    mutationFn: (body: Partial<StaffPushConfig>) =>
      api.patch<StaffPushConfig>('/notifications/staff-push-config', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['staff-push-config'] });
      Alert.alert('Saved', 'Staff push settings updated for all devices.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });

  const testPush = useMutation({
    mutationFn: () => api.post<{ ok: boolean; devices: number }>('/notifications/test-push'),
    onSuccess: async (res) => {
      await playNewOrderRingtone(prefs);
      Alert.alert(
        'Test sent',
        res.devices
          ? `Push queued to ${res.devices} device(s). You should also hear the ringtone.`
          : 'No device token registered yet — played local ringtone only. Open the app on a real device and allow notifications.',
      );
    },
    onError: async (e: Error) => {
      await playNewOrderRingtone(prefs);
      Alert.alert('Push failed', `${e.message}\nLocal ringtone was still played.`);
    },
  });

  const requestPermission = async () => {
    const res = await Notifications.requestPermissionsAsync();
    setPermission(res.status);
    if (res.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Enable notifications in system settings for new order alerts.',
      );
    }
  };

  const roles = remote.data?.recipientRoles ?? [];
  const toggleRole = (role: string) => {
    if (!canManageMenu(user)) return;
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    saveRemote.mutate({
      recipientRoles: next.length ? next : ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF'],
    });
  };

  return (
    <Screen>
      <AppHeader title="Notifications" subtitle="New order alerts & ringtone" />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.card}>
          <Text style={styles.section}>Device settings</Text>
          <Text style={styles.hint}>Permission: {permission}</Text>
          {permission !== 'granted' && (
            <PrimaryButton
              title="Allow notifications"
              onPress={requestPermission}
              style={styles.btn}
            />
          )}

          <Row
            label="🔔 New order notifications"
            value={prefs.enabled}
            onChange={(v) => void persistPrefs({ ...prefs, enabled: v })}
          />
          <Row
            label="🔊 Custom ringtone"
            value={prefs.ringtoneEnabled}
            onChange={(v) => void persistPrefs({ ...prefs, ringtoneEnabled: v })}
          />
          <Row
            label="📳 Vibration"
            value={prefs.vibrationEnabled}
            onChange={(v) => void persistPrefs({ ...prefs, vibrationEnabled: v })}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Notification volume</Text>
          <View style={styles.volumeRow}>
            {[0.4, 0.7, 1].map((v) => (
              <Pressable
                key={v}
                onPress={() => void persistPrefs({ ...prefs, volume: v })}
                style={[styles.volumeChip, prefs.volume === v && styles.volumeChipOn]}
              >
                <Text style={[styles.volumeText, prefs.volume === v && styles.volumeTextOn]}>
                  {v === 0.4 ? 'Low' : v === 0.7 ? 'Med' : 'High'}
                </Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            title="🧪 Test notification"
            onPress={() => testPush.mutate()}
            style={styles.btn}
          />
        </Card>

        {canManageMenu(user) && (
          <Card style={styles.card}>
            <Text style={styles.section}>Restaurant-wide (remote)</Text>
            <Text style={styles.hint}>
              Changes apply to staff devices without rebuilding the app (roles & master switch).
            </Text>
            <Row
              label="Enable staff push"
              value={remote.data?.enabled ?? true}
              onChange={(v) => saveRemote.mutate({ enabled: v })}
            />
            <Row
              label="Default ringtone on"
              value={remote.data?.ringtoneEnabled ?? true}
              onChange={(v) => saveRemote.mutate({ ringtoneEnabled: v })}
            />
            <Row
              label="Default vibration on"
              value={remote.data?.vibrationEnabled ?? true}
              onChange={(v) => saveRemote.mutate({ vibrationEnabled: v })}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>Recipients / roles</Text>
            {ROLE_OPTIONS.map((role) => (
              <Pressable key={role.key} style={styles.roleRow} onPress={() => toggleRole(role.key)}>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleCheck}>{roles.includes(role.key) ? '✓' : '○'}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.section}>Missed orders</Text>
          <Text style={styles.hint}>Persisted on this device after push alerts arrive.</Text>
          {inbox.length === 0 ? (
            <Text style={styles.empty}>No recent order alerts</Text>
          ) : (
            inbox.slice(0, 15).map((item) => (
              <Pressable
                key={item.orderId}
                style={styles.inboxRow}
                onPress={() => router.push(`/orders/${item.orderId}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.inboxTitle}>
                    #{item.orderNumber} {item.read ? '' : '· NEW'}
                  </Text>
                  <Text style={styles.hint}>
                    {[item.customerName, item.orderType, item.amount].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: '#d1d5db' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 12, paddingBottom: 40, gap: 12 },
  card: { gap: 8 },
  section: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  hint: { color: theme.colors.muted, fontSize: 12, lineHeight: 16 },
  label: { fontWeight: '700', color: theme.colors.text, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowLabel: { flex: 1, fontWeight: '600', color: theme.colors.text, paddingRight: 8 },
  btn: { marginTop: 12 },
  volumeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  volumeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  volumeChipOn: { backgroundColor: theme.colors.primary },
  volumeText: { fontWeight: '700', color: theme.colors.text },
  volumeTextOn: { color: '#fff' },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  roleLabel: { fontWeight: '600', color: theme.colors.text },
  roleCheck: { fontWeight: '800', color: theme.colors.primary, fontSize: 16 },
  empty: { color: theme.colors.muted, marginTop: 6 },
  inboxRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  inboxTitle: { fontWeight: '800', color: theme.colors.text },
});
