import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { sendOtp, verifyOtp } from '@/lib/auth-api';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { WEBSITE_URL } from '@/lib/constants';
import { resolveAssetUrl } from '@/ui/theme';

export default function LoginScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : '/(tabs)';

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoUri = resolveAssetUrl(
    config.branding.logoUrl ?? config.branding.splashLogoUrl,
    WEBSITE_URL,
  );

  function continueAfterAuth() {
    router.replace(returnTo as '/(tabs)');
  }

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    try {
      const normalized = phone.replace(/\D/g, '').slice(-10);
      if (normalized.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
      await sendOtp({ phone: normalized });
      setPhone(normalized);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      await verifyOtp({ phone, otp });
      continueAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" />
        ) : (
          <Text style={styles.logo}>🥞</Text>
        )}
        <Text style={styles.title}>{config.branding.appName}</Text>
        <Text style={styles.tagline}>{config.branding.tagline}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {step === 'phone' ? 'Login with Mobile OTP' : 'Enter OTP'}
        </Text>

        {step === 'phone' ? (
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="6-digit OTP"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
          onPress={step === 'phone' ? handleSendOtp : handleVerify}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? 'Please wait…' : step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
          </Text>
        </Pressable>

        {step === 'otp' ? (
          <Pressable onPress={() => setStep('phone')}>
            <Text style={styles.link}>Change number</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() =>
            router.replace(returnTo.includes('checkout') ? '/(tabs)' : (returnTo as '/(tabs)'))
          }
        >
          <Text style={styles.guest}>Continue as Guest →</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 48 },
  logoImg: { width: 88, height: 88, borderRadius: 44 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 8 },
  tagline: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#14532D', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#1F2937', fontWeight: '700', fontSize: 16 },
  link: { color: '#14532D', textAlign: 'center', marginTop: 12, fontWeight: '600' },
  guest: { color: '#6B7280', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
