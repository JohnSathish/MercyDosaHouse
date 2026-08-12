import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Card, LoadingBlock, PrimaryButton, Screen, StatusChip } from '@/ui';
import { theme } from '@/ui/theme';

export default function SettingsScreen() {
  const qc = useQueryClient();
  const business = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get<any>('/settings/business'),
  });
  const restaurant = useQuery({
    queryKey: ['restaurant-status'],
    queryFn: () => api.get<any>('/settings/restaurant-status'),
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (business.data) setForm(business.data);
  }, [business.data]);
  const save = useMutation({
    mutationFn: () => api.patch('/settings/business', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-settings'] });
      Alert.alert('Saved', 'Business settings updated.');
    },
    onError: (e: Error) => Alert.alert('Save failed', e.message),
  });
  const status = useMutation({
    mutationFn: () =>
      api.patch('/settings/restaurant-status', { storeOpen: !restaurant.data?.storeOpen }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-status'] }),
    onError: (e: Error) => Alert.alert('Status failed', e.message),
  });
  const set = (k: string, v: any) => setForm((x: any) => ({ ...x, [k]: v }));
  if (business.isLoading || restaurant.isLoading)
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    );
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.row}>
            <View>
              <Text style={styles.heading}>Online ordering</Text>
              <Text style={styles.muted}>Immediately controls order availability</Text>
            </View>
            <StatusChip
              label={restaurant.data?.storeOpen ? 'OPEN' : 'CLOSED'}
              tone={restaurant.data?.storeOpen ? 'success' : 'danger'}
            />
          </View>
          <PrimaryButton
            title={restaurant.data?.storeOpen ? 'Close Restaurant' : 'Open Restaurant'}
            variant={restaurant.data?.storeOpen ? 'danger' : 'primary'}
            onPress={() => status.mutate()}
            loading={status.isPending}
            style={{ marginTop: 14 }}
          />
        </Card>
        <Card>
          <Text style={styles.heading}>Business details</Text>
          <Field
            label="Restaurant name"
            value={form.name ?? form.businessName ?? ''}
            onChangeText={(v: string) => set(form.name !== undefined ? 'name' : 'businessName', v)}
          />
          <Field
            label="Phone"
            value={form.phone ?? ''}
            onChangeText={(v: string) => set('phone', v)}
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={form.email ?? ''}
            onChangeText={(v: string) => set('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Address"
            value={form.address ?? ''}
            onChangeText={(v: string) => set('address', v)}
            multiline
          />
          <Field
            label="GSTIN"
            value={form.gstin ?? form.gstNumber ?? ''}
            onChangeText={(v: string) => set(form.gstin !== undefined ? 'gstin' : 'gstNumber', v)}
            autoCapitalize="characters"
          />
          <Toggle
            label="Accept online orders"
            value={form.acceptOnlineOrders !== false}
            onValueChange={(v: boolean) => set('acceptOnlineOrders', v)}
          />
          <PrimaryButton
            title="Save Business Settings"
            onPress={() => save.mutate()}
            loading={save.isPending}
            style={{ marginTop: 14 }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
function Field({ label, ...props }: any) {
  return (
    <View style={{ marginTop: 12 }}>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  heading: { fontSize: 17, fontWeight: '900', color: theme.colors.primary },
  muted: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
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
    paddingTop: 14,
  },
  name: { fontWeight: '700', color: theme.colors.text },
});
