import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { PrimaryButton, Screen } from '@/ui';
import { theme, formatInr } from '@/ui/theme';
import type { InvoiceDto } from '@mdh/types';

type Line = { description: string; quantity: string; unitPrice: string };

export default function NewInvoiceScreen() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [customerType, setCustomerType] = useState('ORGANISATION');
  const [items, setItems] = useState<Line[]>([{ description: '', quantity: '1', unitPrice: '0' }]);
  const [saving, setSaving] = useState(false);

  const grand = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);

  async function save() {
    setSaving(true);
    try {
      const inv = await api.post<InvoiceDto>('/invoices', {
        customerType,
        customerName,
        phone,
        email,
        whatsapp: whatsapp || phone,
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description.trim(),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          })),
      });
      router.replace(`/invoices/${inv.id}` as never);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Customer type</Text>
        {['ORGANISATION', 'INSTITUTION', 'FAMILY', 'INDIVIDUAL', 'EVENT', 'OTHER'].map((t) => (
          <Text
            key={t}
            style={[styles.chip, customerType === t && styles.chipOn]}
            onPress={() => setCustomerType(t)}
          >
            {t.replace('_', ' ')}
          </Text>
        ))}
        <Field
          label="Customer / Organisation"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Text style={styles.heading}>Items</Text>
        {items.map((row, idx) => (
          <View key={idx} style={styles.item}>
            <Field
              label="Item"
              value={row.description}
              onChangeText={(v) =>
                setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, description: v } : r)))
              }
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Qty"
                  value={row.quantity}
                  keyboardType="numeric"
                  onChangeText={(v) =>
                    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, quantity: v } : r)))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Price"
                  value={row.unitPrice}
                  keyboardType="numeric"
                  onChangeText={(v) =>
                    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, unitPrice: v } : r)))
                  }
                />
              </View>
            </View>
            <Text style={styles.amt}>
              {formatInr(Number(row.quantity || 0) * Number(row.unitPrice || 0))}
            </Text>
          </View>
        ))}
        <PrimaryButton
          title="+ Add item"
          variant="ghost"
          onPress={() =>
            setItems((r) => [...r, { description: '', quantity: '1', unitPrice: '0' }])
          }
        />
        <Text style={styles.total}>Grand total {formatInr(grand)}</Text>
        <PrimaryButton title="Save invoice" onPress={() => void save()} loading={saving} />
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, color: theme.colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  heading: { fontWeight: '800', color: theme.colors.primary, marginVertical: 10 },
  item: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  amt: { fontWeight: '700', textAlign: 'right' },
  total: { fontSize: 18, fontWeight: '800', color: theme.colors.primary, marginVertical: 12 },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: theme.colors.secondary, color: '#fff', fontWeight: '700' },
});
