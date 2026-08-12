import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.announcements ?? []));
export default function AnnouncementsScreen() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<any>('/marketing/announcements'),
  });
  const toggle = useMutation({
    mutationFn: (x: any) =>
      api.patch(`/marketing/announcements/${x.id}`, { isActive: !x.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });
  return (
    <Screen>
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(x: any) => x.id}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No announcements" onRetry={query.refetch} />}
        renderItem={({ item: x }: any) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{x.title ?? 'Announcement'}</Text>
                <Text style={styles.body}>{x.message ?? x.content ?? x.description}</Text>
                <StatusChip label={x.type ?? x.placement ?? 'GENERAL'} tone="info" />
              </View>
              <Switch
                value={!!x.isActive}
                onValueChange={() => toggle.mutate(x)}
                trackColor={{ true: theme.colors.success }}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  name: { fontWeight: '900', color: theme.colors.text, fontSize: 16 },
  body: { color: theme.colors.muted, marginVertical: 8, lineHeight: 19 },
});
