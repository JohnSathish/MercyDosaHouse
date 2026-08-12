import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, LoadingBlock, PrimaryButton, Screen } from '@/ui';
import { theme } from '@/ui/theme';

export default function MobileConfigScreen() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['mobile-admin-config'],
    queryFn: () => api.get<any>('/mobile/admin/config'),
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);
  const save = useMutation({
    mutationFn: () => api.patch('/mobile/admin/config', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mobile-admin-config'] });
      Alert.alert('Saved', 'Mobile app configuration updated.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });
  const set = (k: string, v: any) => setForm((x: any) => ({ ...x, [k]: v }));
  if (query.isLoading)
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Text style={styles.heading}>Release settings</Text>
          <Field
            label="Minimum supported version"
            value={String(form.minimumVersion ?? form.minVersion ?? '')}
            onChangeText={(v: string) =>
              set(form.minimumVersion !== undefined ? 'minimumVersion' : 'minVersion', v)
            }
          />
          <Field
            label="Latest version"
            value={String(form.latestVersion ?? '')}
            onChangeText={(v: string) => set('latestVersion', v)}
          />
          <Toggle
            label="Force update"
            value={!!form.forceUpdate}
            onValueChange={(v: boolean) => set('forceUpdate', v)}
          />
          <Toggle
            label="Maintenance mode"
            value={!!form.maintenanceMode}
            onValueChange={(v: boolean) => set('maintenanceMode', v)}
          />
          <Field
            label="Maintenance message"
            value={form.maintenanceMessage ?? ''}
            onChangeText={(v: string) => set('maintenanceMessage', v)}
            multiline
          />
          <PrimaryButton
            title="Save Configuration"
            onPress={() => save.mutate()}
            loading={save.isPending}
          />
        </Card>
        <Card>
          <Text style={styles.heading}>Feature flags</Text>
          {Object.entries(form.featureFlags ?? {}).map(([key, value]) => (
            <Toggle
              key={key}
              label={key.replace(/([A-Z])/g, ' $1')}
              value={!!value}
              onValueChange={(v: boolean) =>
                set('featureFlags', { ...(form.featureFlags ?? {}), [key]: v })
              }
            />
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={theme.colors.muted}
      />
    </View>
  );
}
function Toggle({ label, ...props }: any) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.name}>{label}</Text>
      <Switch {...props} trackColor={{ true: theme.colors.success }} />
    </View>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  heading: { fontSize: 17, fontWeight: '900', color: theme.colors.primary, marginBottom: 14 },
  label: { color: theme.colors.muted, fontWeight: '700', fontSize: 12, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 11,
    color: theme.colors.text,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  name: { textTransform: 'capitalize', fontWeight: '700', color: theme.colors.text, flex: 1 },
});
