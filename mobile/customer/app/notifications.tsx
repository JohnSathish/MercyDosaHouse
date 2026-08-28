import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';
import { COLORS, RADIUS, SHADOW } from '@/ui/theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
  data?: { orderId?: string; orderNumber?: string } | null;
}

function iconFor(title: string, type?: string) {
  const t = `${type ?? ''} ${title}`.toLowerCase();
  if (t.includes('deliver')) return '🛵';
  if (t.includes('prepar')) return '👨‍🍳';
  if (t.includes('ready')) return '📦';
  if (t.includes('confirm') || t.includes('accepted')) return '✅';
  if (t.includes('offer') || t.includes('promo')) return '🎁';
  if (t.includes('closed') || t.includes('open')) return '🏪';
  return '🔔';
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    retry: false,
  });

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Notifications</Text>
      </View>

      {notifications.length ? (
        <Pressable
          onPress={async () => {
            await api.post('/notifications/read-all');
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Mark all as read</Text>
        </Pressable>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Sign in to view notifications.</Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { returnTo: '/notifications' },
              })
            }
          >
            <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.card, !n.isRead && styles.unread]}
              onPress={() => {
                void markRead(n.id);
                if (n.data?.orderNumber) {
                  router.push(`/track/${encodeURIComponent(n.data.orderNumber)}`);
                }
              }}
            >
              <Text style={styles.icon}>{iconFor(n.title, n.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardBody}>{n.body}</Text>
                <Text style={styles.date}>{new Date(n.createdAt).toLocaleString()}</Text>
              </View>
              {!n.isRead ? (
                <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
              ) : null}
            </Pressable>
          ))}
          {!notifications.length ? <Text style={styles.empty}>No notifications yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  back: { fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
  link: { fontWeight: '700', marginTop: 12 },
  card: {
    ...SHADOW.card,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  unread: { borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  icon: { fontSize: 22, marginTop: 2 },
  cardTitle: { fontWeight: '700', color: COLORS.text },
  cardBody: { color: COLORS.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  date: { color: COLORS.textLight, fontSize: 11, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
