import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AddressDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useThemeColors } from '@/providers/config-context';

export default function AddressesScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<AddressDto[]>('/users/me/addresses'),
    retry: false,
  });

  async function removeAddress(id: string) {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/users/me/addresses/${id}`);
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.primary }]}>Saved Addresses</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.card}>
              <Text style={styles.label}>{addr.label ?? addr.addressType ?? 'Address'}</Text>
              <Text style={styles.body}>
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ''}
              </Text>
              <Text style={styles.meta}>
                {addr.city}, {addr.state} — {addr.pincode}
              </Text>
              <Text style={styles.meta}>
                {addr.contactName} · {addr.mobileNumber}
              </Text>
              {addr.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
              {addr.id ? (
                <Pressable onPress={() => removeAddress(addr.id!)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {!addresses.length ? <Text style={styles.empty}>No saved addresses yet.</Text> : null}
        </ScrollView>
      )}

      <Pressable
        style={[styles.addBtn, { backgroundColor: colors.secondary }]}
        onPress={() => router.push('/addresses/new')}
      >
        <Text style={styles.addText}>+ Add Address</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7E6' },
  header: { padding: 16 },
  back: { color: '#14532D', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingTop: 0, paddingBottom: 80 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  label: { fontWeight: '700', color: '#14532D' },
  body: { color: '#374151', marginTop: 4 },
  meta: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  defaultBadge: { color: '#059669', fontWeight: '600', fontSize: 12, marginTop: 6 },
  delete: { color: '#DC2626', fontWeight: '600', marginTop: 8, fontSize: 13 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
  addBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: { fontWeight: '700', color: '#1F2937', fontSize: 16 },
});
