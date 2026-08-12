import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, Screen, StatusChip } from '@/ui';
import { theme, timeAgo } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.sections ?? []));
export default function CmsScreen() {
  const query = useQuery({
    queryKey: ['cms-sections'],
    queryFn: async () => {
      try {
        return await api.get<any>('/cms/sections');
      } catch {
        return api.get<any>('/cms/published');
      }
    },
  });
  return (
    <Screen>
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(x: any, i) => x.id ?? String(i)}
        refreshing={query.isRefetching}
        onRefresh={query.refetch}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Card style={styles.info}>
            <Text style={styles.title}>Website content</Text>
            <Text style={styles.muted}>
              Review section publication status here. Full content editing remains available in the
              web admin.
            </Text>
          </Card>
        }
        ListEmptyComponent={
          <EmptyState
            title="No CMS sections"
            message="The published website summary may not contain editable sections."
            onRetry={query.refetch}
          />
        }
        renderItem={({ item: x }: any) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{x.title ?? x.name ?? x.key ?? x.type}</Text>
                <Text style={styles.muted}>
                  {x.description ?? x.subtitle ?? `Position ${x.sortOrder ?? x.order ?? '—'}`}
                </Text>
                {x.updatedAt ? (
                  <Text style={styles.date}>Updated {timeAgo(x.updatedAt)}</Text>
                ) : null}
              </View>
              <StatusChip
                label={x.isPublished || x.published ? 'PUBLISHED' : x.isActive ? 'ACTIVE' : 'DRAFT'}
                tone={x.isPublished || x.published || x.isActive ? 'success' : 'neutral'}
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
  info: { backgroundColor: '#ECFDF5' },
  title: { fontWeight: '900', fontSize: 18, color: theme.colors.primary },
  muted: { color: theme.colors.muted, marginTop: 6, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  name: { fontWeight: '800', fontSize: 16, color: theme.colors.text },
  date: { color: theme.colors.muted, fontSize: 11, marginTop: 8 },
});
