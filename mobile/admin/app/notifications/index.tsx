import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { AppHeader, EmptyState, Screen } from '@/ui';
import { theme, timeAgo } from '@/ui/theme';

type InboxRow = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  href?: string | null;
  androidPath?: string | null;
  category: string;
};

type InboxList = {
  data: InboxRow[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
};

const FILTERS = ['ALL', 'ORDER', 'PAYMENT', 'INVENTORY', 'CUSTOMER', 'DELIVERY'] as const;

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [category, setCategory] = useState<(typeof FILTERS)[number]>('ALL');
  const query = useQuery({
    queryKey: ['admin-inbox', category],
    queryFn: () => api.get<InboxList>(`/notifications/inbox?limit=40&page=1&category=${category}`),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-inbox'] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-inbox'] }),
  });

  const rows = query.data?.data ?? [];
  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const sections: { title: string; data: InboxRow[] }[] = [
      { title: 'Today', data: [] },
      { title: 'Yesterday', data: [] },
      { title: 'Earlier', data: [] },
    ];
    for (const row of rows) {
      const d = new Date(row.createdAt);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) sections[0].data.push(row);
      else if (d.getTime() === y.getTime()) sections[1].data.push(row);
      else sections[2].data.push(row);
    }
    return sections.filter((s) => s.data.length);
  }, [rows]);

  const listData = grouped.flatMap((s) => [{ id: `h-${s.title}`, header: s.title }, ...s.data]);

  return (
    <Screen>
      <AppHeader
        title="Notifications"
        subtitle={query.data ? `${query.data.unreadCount} unread` : 'Inbox'}
        onMenuPress={() => router.back()}
      />
      <View style={styles.filters}>
        {FILTERS.map((key) => (
          <Pressable
            key={key}
            onPress={() => setCategory(key)}
            style={[styles.chip, category === key && styles.chipOn]}
          >
            <Text style={[styles.chipText, category === key && styles.chipTextOn]}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => markAll.mutate()} style={styles.markAll}>
        <Text style={styles.markAllText}>Mark all as read</Text>
      </Pressable>
      <FlatList
        data={listData}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.isLoading ? null : (
            <EmptyState title="You're all caught up" message="No new notifications." />
          )
        }
        renderItem={({ item }: any) =>
          item.header ? (
            <Text style={styles.section}>{item.header}</Text>
          ) : (
            <Pressable
              style={[styles.row, !item.isRead && styles.unread]}
              onPress={() => {
                if (!item.isRead) markRead.mutate(item.id);
                router.push((item.androidPath || '/(tabs)/orders') as any);
              }}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </Pressable>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: theme.colors.muted },
  chipTextOn: { color: '#fff' },
  markAll: { paddingHorizontal: 16, paddingVertical: 8 },
  markAllText: { color: theme.colors.primary, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 40 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.muted,
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unread: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  title: { fontWeight: '800', color: theme.colors.text },
  body: { color: theme.colors.muted, marginTop: 4 },
  time: { color: theme.colors.muted, fontSize: 11, marginTop: 6 },
});
