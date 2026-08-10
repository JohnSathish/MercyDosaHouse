import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

export default function NewAddressScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactName: '',
    mobileNumber: '',
    label: 'Home',
    line1: '',
    line2: '',
    landmark: '',
    city: 'Shillong',
    state: 'Meghalaya',
    pincode: '',
    deliveryNotes: '',
    isDefault: true,
  });

  function update(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function save() {
    if (!form.contactName || !form.mobileNumber || !form.line1 || !form.pincode) {
      Alert.alert('Missing fields', 'Please fill name, phone, address, and pincode.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/users/me/addresses', form);
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['checkout-profile'] });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Add Address</Text>

        <Field
          label="Contact Name"
          value={form.contactName}
          onChange={(v) => update({ contactName: v })}
        />
        <Field
          label="Mobile"
          value={form.mobileNumber}
          onChange={(v) => update({ mobileNumber: v })}
          keyboardType="phone-pad"
        />
        <Field label="Label" value={form.label} onChange={(v) => update({ label: v })} />
        <Field label="Address Line 1" value={form.line1} onChange={(v) => update({ line1: v })} />
        <Field label="Address Line 2" value={form.line2} onChange={(v) => update({ line2: v })} />
        <Field label="Landmark" value={form.landmark} onChange={(v) => update({ landmark: v })} />
        <Field label="City" value={form.city} onChange={(v) => update({ city: v })} />
        <Field
          label="Pincode"
          value={form.pincode}
          onChange={(v) => update({ pincode: v })}
          keyboardType="number-pad"
        />
        <Field
          label="Delivery Notes"
          value={form.deliveryNotes}
          onChange={(v) => update({ deliveryNotes: v })}
        />

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save Address'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  content: { padding: 16, paddingBottom: 32 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { fontWeight: '600', color: '#374151', marginBottom: 4, fontSize: 13 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
