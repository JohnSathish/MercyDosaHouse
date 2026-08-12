import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, EmptyState, PrimaryButton, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

const rowsOf = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.items ?? []));
export default function EmailsScreen() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const query = useQuery({
    queryKey: ['notification-emails'],
    queryFn: () => api.get<any>('/settings/order-notification-emails'),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notification-emails'] });
  const add = useMutation({
    mutationFn: () =>
      api.post('/settings/order-notification-emails', { email: email.trim().toLowerCase() }),
    onSuccess: () => {
      setEmail('');
      invalidate();
    },
    onError: (e: Error) => Alert.alert('Add failed', e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: any) => api.patch(`/settings/order-notification-emails/${id}`, body),
    onSuccess: invalidate,
    onError: (e: Error) => Alert.alert('Update failed', e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/order-notification-emails/${id}`),
    onSuccess: invalidate,
    onError: (e: Error) => Alert.alert('Delete failed', e.message),
  });
  const test = useMutation({
    mutationFn: () =>
      api.post('/settings/email/test', {
        email: email.trim() || rowsOf(query.data).find((x: any) => x.isActive)?.email,
      }),
    onSuccess: () => Alert.alert('Test sent', 'Check the recipient inbox.'),
    onError: (e: Error) => Alert.alert('Test failed', e.message),
  });
  return (
    <Screen>
      <View style={styles.add}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="notifications@example.com"
          placeholderTextColor={theme.colors.muted}
        />
        <PrimaryButton
          title="Add"
          onPress={() => add.mutate()}
          disabled={!email.includes('@')}
          loading={add.isPending}
        />
      </View>
      <PrimaryButton
        title={email ? 'Send Test to Entered Email' : 'Send Test Email'}
        variant="secondary"
        onPress={() => test.mutate()}
        loading={test.isPending}
        style={{ marginHorizontal: 12, marginBottom: 12 }}
      />
      <FlatList
        data={rowsOf(query.data)}
        keyExtractor={(x: any) => x.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No notification recipients" onRetry={query.refetch} />
        }
        renderItem={({ item: x }: any) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{x.email}</Text>
                <StatusChip
                  label={x.isActive ? 'ACTIVE' : 'DISABLED'}
                  tone={x.isActive ? 'success' : 'neutral'}
                />
              </View>
              <Switch
                value={!!x.isActive}
                onValueChange={(isActive) => update.mutate({ id: x.id, body: { isActive } })}
                trackColor={{ true: theme.colors.success }}
              />
            </View>
            <PrimaryButton
              title="Delete"
              variant="ghost"
              onPress={() =>
                Alert.alert('Remove email?', x.email, [
                  { text: 'Keep' },
                  { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(x.id) },
                ])
              }
              style={{ marginTop: 8 }}
            />
          </Card>
        )}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { flexDirection: 'row', gap: 8, padding: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 11,
    backgroundColor: '#fff',
    color: theme.colors.text,
  },
  list: { padding: 12, paddingTop: 0, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  email: { fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
});
