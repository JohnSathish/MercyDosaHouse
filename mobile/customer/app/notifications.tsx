import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Notifications</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.empty}>Sign in to view notifications.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.card, !n.isRead && styles.unread]}
              onPress={() => markRead(n.id)}
            >
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.cardBody}>{n.body}</Text>
              <Text style={styles.date}>{new Date(n.createdAt).toLocaleString()}</Text>
            </Pressable>
          ))}
          {!notifications.length ? <Text style={styles.empty}>No notifications yet.</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  cardTitle: { fontWeight: '700', color: '#1F2937' },
  cardBody: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  date: { color: '#9CA3AF', fontSize: 11, marginTop: 6 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
});
