import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { AddressType } from '@mdh/types';
import type { AddressDto, DeliveryPincodeCheckDto } from '@mdh/types';
import { buildOsmMapHtml } from '@mdh/mobile-shared';
import { ADDRESS_LABEL_CHIPS, DELIVERY_INSTRUCTION_EXAMPLES, INDIAN_STATES } from '@mdh/utils';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ErrorBoundary } from '@/components/error-boundary';
import { COLORS, RADIUS } from '@/ui/theme';

const OSMWebView = WebView as unknown as ComponentType<any>;

export type AddressFormValue = {
  contactName: string;
  mobileNumber: string;
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  deliveryNotes: string;
  addressType: AddressType;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
};

export function emptyAddressForm(defaults?: { name?: string; phone?: string }): AddressFormValue {
  const phone = defaults?.phone?.replace(/\D/g, '').slice(-10) ?? '';
  return {
    contactName: defaults?.name?.trim() ?? '',
    mobileNumber: phone,
    label: 'Home',
    line1: '',
    line2: '',
    landmark: '',
    city: 'Tura',
    state: 'Meghalaya',
    pincode: '',
    country: 'India',
    deliveryNotes: '',
    addressType: AddressType.HOME,
    isDefault: false,
  };
}

function mapHtmlForPin(latitude: number, longitude: number): string | null {
  try {
    return buildOsmMapHtml({
      points: [
        {
          id: 'delivery',
          latitude,
          longitude,
          label: 'Delivery location',
          type: 'customer',
        },
      ],
      interactive: true,
    });
  } catch {
    return null;
  }
}

function FieldLabel({ icon, children }: { icon: string; children: string }) {
  return (
    <Text style={styles.fieldLabel}>
      <Text>{icon} </Text>
      {children}
    </Text>
  );
}

export function AddressForm({
  value,
  onChange,
  footer,
}: {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
  footer?: ReactNode;
}) {
  const [locating, setLocating] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [pincodeCheck, setPincodeCheck] = useState<DeliveryPincodeCheckDto | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const pincode = useDebouncedValue(value.pincode.replace(/\D/g, '').slice(0, 6), 400);

  function update(patch: Partial<AddressFormValue>) {
    onChange({ ...value, ...patch });
  }

  useEffect(() => {
    if (pincode.length !== 6) {
      setPincodeCheck(null);
      setCheckingPincode(false);
      return;
    }
    let cancelled = false;
    setCheckingPincode(true);
    api
      .get<DeliveryPincodeCheckDto>(`/settings/delivery-check?pincode=${pincode}`)
      .then((result) => {
        if (!cancelled) setPincodeCheck(result);
      })
      .catch(() => {
        if (!cancelled) setPincodeCheck(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingPincode(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Location permission needed',
          'Allow location access to fill the address from your current pin.',
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      const line1 = [place?.name, place?.streetNumber, place?.street].filter(Boolean).join(', ');
      const pinFallback = `Pinned location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
      update({
        latitude,
        longitude,
        line1: line1 || value.line1 || pinFallback,
        city: place?.city || place?.district || place?.subregion || value.city || 'Tura',
        state: place?.region || value.state || 'Meghalaya',
        pincode: (place?.postalCode || value.pincode || '').replace(/\D/g, '').slice(0, 6),
      });
    } catch {
      Alert.alert('Location unavailable', 'Enter the address manually or try again outdoors.');
    } finally {
      setLocating(false);
    }
  }

  const html = useMemo(() => {
    if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
    return mapHtmlForPin(value.latitude, value.longitude);
  }, [value.latitude, value.longitude]);

  function selectLabel(label: string) {
    update({
      label,
      addressType:
        label === 'Office'
          ? AddressType.OFFICE
          : label === 'Other'
            ? AddressType.OTHER
            : AddressType.HOME,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Save a complete delivery address with contact details for this location.
        </Text>

        <FieldLabel icon="👤">Contact Person Name *</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder="John Sathish"
          placeholderTextColor={COLORS.textLight}
          value={value.contactName}
          onChangeText={(contactName) => update({ contactName })}
        />

        <FieldLabel icon="📱">Mobile Number *</FieldLabel>
        <View style={styles.phoneWrap}>
          <Text style={styles.phonePrefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="95663 63655"
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
            maxLength={10}
            value={value.mobileNumber}
            onChangeText={(v) => update({ mobileNumber: v.replace(/\D/g, '').slice(0, 10) })}
          />
        </View>

        <FieldLabel icon="🏷️">Address Label</FieldLabel>
        <View style={styles.chipRow}>
          {ADDRESS_LABEL_CHIPS.map(({ emoji, label }) => {
            const active = value.label === label;
            return (
              <Pressable
                key={label}
                onPress={() => selectLabel(label)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {emoji} {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Or custom label…"
          placeholderTextColor={COLORS.textLight}
          value={value.label}
          onChangeText={(label) => update({ label })}
        />

        <Pressable
          style={styles.locationBtn}
          onPress={() => void useCurrentLocation()}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.locationBtnText}>📍 Use Current Location</Text>
          )}
        </Pressable>

        {html ? (
          <ErrorBoundary
            fallback={
              <View style={styles.mapFallback}>
                <Text style={styles.hint}>
                  Map preview is unavailable. Your pin is still saved.
                </Text>
              </View>
            }
          >
            <OSMWebView
              originWhitelist={['*']}
              source={{ html }}
              javaScriptEnabled
              onMessage={(event: { nativeEvent: { data: string } }) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data) as {
                    type?: string;
                    latitude?: number;
                    longitude?: number;
                  };
                  if (
                    message.type === 'location' &&
                    Number.isFinite(message.latitude) &&
                    Number.isFinite(message.longitude)
                  ) {
                    update({ latitude: message.latitude, longitude: message.longitude });
                  }
                } catch {
                  /* ignore malformed WebView messages */
                }
              }}
              style={styles.map}
            />
          </ErrorBoundary>
        ) : null}

        <FieldLabel icon="🏠">Address Line 1 *</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder="House No, Street Name"
          placeholderTextColor={COLORS.textLight}
          value={value.line1}
          onChangeText={(line1) => update({ line1 })}
        />

        <FieldLabel icon="🏢">Address Line 2</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder="Apartment, Building"
          placeholderTextColor={COLORS.textLight}
          value={value.line2}
          onChangeText={(line2) => update({ line2 })}
        />

        <FieldLabel icon="📍">Landmark</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder="Near Bus Stand"
          placeholderTextColor={COLORS.textLight}
          value={value.landmark}
          onChangeText={(landmark) => update({ landmark })}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <FieldLabel icon="🏙️">City *</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="Tura"
              placeholderTextColor={COLORS.textLight}
              value={value.city}
              onChangeText={(city) => update({ city })}
            />
          </View>
          <View style={styles.half}>
            <FieldLabel icon="📮">Pincode *</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="794001"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={6}
              value={value.pincode}
              onChangeText={(v) => update({ pincode: v.replace(/\D/g, '').slice(0, 6) })}
            />
          </View>
        </View>

        {checkingPincode || pincodeCheck ? (
          <View
            style={[
              styles.pincodeBanner,
              checkingPincode
                ? styles.pincodePending
                : pincodeCheck?.available
                  ? styles.pincodeOk
                  : styles.pincodeBad,
            ]}
          >
            {checkingPincode ? (
              <Text style={styles.pincodePendingText}>Checking delivery availability…</Text>
            ) : pincodeCheck?.available ? (
              <Text style={styles.pincodeOkText}>
                Delivery available{'\n'}
                <Text style={styles.pincodeOkSub}>{pincodeCheck.message}</Text>
              </Text>
            ) : (
              <Text style={styles.pincodeBadText}>{pincodeCheck?.message}</Text>
            )}
          </View>
        ) : null}

        <FieldLabel icon="🗺️">State *</FieldLabel>
        <Pressable style={styles.select} onPress={() => setStateOpen(true)}>
          <Text style={styles.selectValue}>{value.state}</Text>
          <Text style={styles.selectChevron}>▾</Text>
        </Pressable>

        <FieldLabel icon="📌">Address Type</FieldLabel>
        <View style={styles.typeRow}>
          {[
            { value: AddressType.HOME, label: 'Home' },
            { value: AddressType.OFFICE, label: 'Office' },
            { value: AddressType.OTHER, label: 'Other' },
          ].map((option) => {
            const active = value.addressType === option.value;
            return (
              <Pressable
                key={option.value}
                style={styles.typeOption}
                onPress={() => update({ addressType: option.value })}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.typeLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel icon="📝">Delivery Instructions</FieldLabel>
        <TextInput
          style={[styles.input, styles.notes]}
          placeholder="Example: Ring the bell once, call before delivery…"
          placeholderTextColor={COLORS.textLight}
          multiline
          textAlignVertical="top"
          value={value.deliveryNotes}
          onChangeText={(deliveryNotes) => update({ deliveryNotes })}
        />
        <Text style={styles.hint}>
          {DELIVERY_INSTRUCTION_EXAMPLES.map((example) => `• ${example}`).join('  ')}
        </Text>

        <Pressable
          style={styles.defaultRow}
          onPress={() => update({ isDefault: !value.isDefault })}
        >
          <View style={[styles.checkbox, value.isDefault && styles.checkboxOn]}>
            {value.isDefault ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.defaultText}>Make this my default address</Text>
        </Pressable>
      </ScrollView>

      {footer}

      <Modal
        visible={stateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStateOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStateOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <Text style={styles.modalTitle}>Select state</Text>
            <ScrollView style={styles.modalList}>
              {INDIAN_STATES.map((state) => (
                <Pressable
                  key={state}
                  style={[styles.modalItem, value.state === state && styles.modalItemActive]}
                  onPress={() => {
                    update({ state });
                    setStateOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      value.state === state && styles.modalItemTextActive,
                    ]}
                  >
                    {state}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export function validateAddressForm(value: AddressFormValue): string | null {
  if (value.contactName.trim().length < 2) return 'Contact person name is required';
  if (!/^[6-9]\d{9}$/.test(value.mobileNumber)) return 'Enter a valid 10-digit mobile number';
  if (value.line1.trim().length < 3) return 'Address line 1 is required';
  if (value.city.trim().length < 2) return 'City is required';
  if (value.state.trim().length < 2) return 'State is required';
  if (!/^\d{6}$/.test(value.pincode.replace(/\D/g, ''))) return 'Enter a valid 6-digit pincode';
  return null;
}

export function toAddressPayload(value: AddressFormValue): AddressDto {
  return {
    contactName: value.contactName.trim(),
    mobileNumber: value.mobileNumber.replace(/\D/g, '').slice(-10),
    label: value.label.trim() || 'Home',
    line1: value.line1.trim(),
    line2: value.line2.trim() || undefined,
    landmark: value.landmark.trim() || undefined,
    city: value.city.trim(),
    state: value.state.trim(),
    pincode: value.pincode.replace(/\D/g, '').slice(0, 6),
    country: value.country || 'India',
    deliveryNotes: value.deliveryNotes.trim() || undefined,
    addressType: value.addressType,
    isDefault: value.isDefault,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  fieldLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFF8E8',
    borderColor: '#E8E0D4',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  phoneWrap: {
    alignItems: 'center',
    backgroundColor: '#FFF8E8',
    borderColor: '#E8E0D4',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingLeft: 14,
  },
  phonePrefix: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginRight: 8 },
  phoneInput: { color: COLORS.text, flex: 1, fontSize: 15, paddingRight: 14, paddingVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#4B5563', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  locationBtn: {
    alignItems: 'center',
    borderColor: 'rgba(20, 83, 45, 0.3)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  locationBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  map: {
    borderRadius: RADIUS.md,
    height: 180,
    marginTop: 12,
    overflow: 'hidden',
  },
  mapFallback: {
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    marginTop: 12,
    padding: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  pincodeBanner: { borderRadius: 10, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pincodePending: { backgroundColor: '#F3F4F6' },
  pincodeOk: { backgroundColor: '#ECFDF5' },
  pincodeBad: { backgroundColor: '#FEF2F2' },
  pincodePendingText: { color: '#4B5563', fontSize: 13 },
  pincodeOkText: { color: '#065F46', fontSize: 13, fontWeight: '700' },
  pincodeOkSub: { fontWeight: '500', opacity: 0.8 },
  pincodeBadText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  select: {
    alignItems: 'center',
    backgroundColor: '#FFF8E8',
    borderColor: '#E8E0D4',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  selectValue: { color: COLORS.text, fontSize: 15 },
  selectChevron: { color: COLORS.primary, fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: 18, marginTop: 4 },
  typeOption: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  radio: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { backgroundColor: COLORS.primary, borderRadius: 4, height: 8, width: 8 },
  typeLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  notes: { minHeight: 88, paddingTop: 12 },
  hint: { color: COLORS.textMuted, fontSize: 10, lineHeight: 15, marginTop: 6 },
  defaultRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 16 },
  checkbox: {
    alignItems: 'center',
    borderColor: '#D1D5DB',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  defaultText: { color: '#4B5563', fontSize: 14 },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalList: { paddingHorizontal: 8 },
  modalItem: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  modalItemActive: { backgroundColor: '#ECFDF5' },
  modalItemText: { color: COLORS.text, fontSize: 15 },
  modalItemTextActive: { color: COLORS.primary, fontWeight: '700' },
});
