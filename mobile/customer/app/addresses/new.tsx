import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { DeliveryPincodeCheckDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useThemeColors } from '@/providers/config-context';
import {
  AddressForm,
  emptyAddressForm,
  toAddressPayload,
  validateAddressForm,
} from '@/components/address-form';

export default function NewAddressScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyAddressForm());

  useEffect(() => {
    setForm((current) => {
      const contactName = current.contactName || user?.name?.trim() || '';
      const mobileNumber = current.mobileNumber || user?.phone?.replace(/\D/g, '').slice(-10) || '';
      if (contactName === current.contactName && mobileNumber === current.mobileNumber) {
        return current;
      }
      return { ...current, contactName, mobileNumber };
    });
  }, [user?.name, user?.phone]);

  async function save() {
    const error = validateAddressForm(form);
    if (error) {
      Alert.alert('Missing details', error);
      return;
    }
    const pincode = form.pincode.replace(/\D/g, '');
    setSaving(true);
    try {
      try {
        const delivery = await api.get<DeliveryPincodeCheckDto>(
          `/settings/delivery-check?pincode=${pincode}`,
        );
        if (delivery?.available === false) {
          Alert.alert(
            'Delivery unavailable',
            delivery.message || 'We do not deliver to this pincode yet.',
          );
          return;
        }
      } catch {
        /* availability check is best-effort */
      }
      await api.post('/users/me/addresses', toAddressPayload(form));
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>📍 Add New Delivery Address</Text>
      </View>

      <AddressForm
        value={form}
        onChange={setForm}
        footer={
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={() => router.back()} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary },
                saving && styles.saveDisabled,
              ]}
              onPress={() => void save()}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : '📍 Save Address'}</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#FFF7E6', flex: 1 },
  header: { paddingBottom: 4, paddingHorizontal: 16, paddingTop: 8 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  footer: {
    backgroundColor: '#FFF7E6',
    borderTopColor: '#E8E0D4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelText: { color: '#14532D', fontSize: 15, fontWeight: '700' },
  saveBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1.4,
    justifyContent: 'center',
    minHeight: 48,
  },
  saveDisabled: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
