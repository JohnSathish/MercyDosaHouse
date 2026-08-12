import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { PrimaryButton } from '@/ui';
import { theme } from '@/ui/theme';
import { APP_VERSION } from '@/lib/constants';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginOtp, requestOtp } = useAuth();
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEmailLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password, remember);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginOtp(phone.trim(), otp.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 12) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>Mercy Dosa House</Text>
          <Text style={styles.tag}>Admin Control Center</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('email')}
              style={[styles.tab, mode === 'email' && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextOn]}>Email</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('otp')}
              style={[styles.tab, mode === 'otp' && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === 'otp' && styles.tabTextOn]}>Phone OTP</Text>
            </Pressable>
          </View>

          {mode === 'email' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="admin@mercydosahouse.com"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Mobile</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
              {otpSent ? (
                <>
                  <Text style={styles.label}>OTP</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="6-digit OTP"
                    placeholderTextColor="#9CA3AF"
                    maxLength={6}
                  />
                </>
              ) : null}
            </>
          )}

          <View style={styles.rememberRow}>
            <Text style={styles.rememberText}>Remember this device</Text>
            <Switch
              value={remember}
              onValueChange={setRemember}
              trackColor={{ true: theme.colors.primary, false: '#D1D5DB' }}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mode === 'email' ? (
            <PrimaryButton title="Sign in" onPress={onEmailLogin} loading={loading} />
          ) : otpSent ? (
            <PrimaryButton title="Verify OTP" onPress={onVerifyOtp} loading={loading} />
          ) : (
            <PrimaryButton title="Send OTP" onPress={onSendOtp} loading={loading} />
          )}
        </View>

        <Text style={styles.footer}>Staff access only · v{APP_VERSION}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.primaryDark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  hero: { marginBottom: 24, alignItems: 'center' },
  brand: { color: '#fff', fontSize: 26, fontWeight: '800' },
  tag: { color: theme.colors.secondary, marginTop: 6, fontWeight: '600', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextOn: { color: theme.colors.primary },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  rememberText: { color: '#374151', fontWeight: '500' },
  error: { color: theme.colors.danger, marginBottom: 12, fontSize: 13 },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.55)', marginTop: 24, fontSize: 12 },
});
