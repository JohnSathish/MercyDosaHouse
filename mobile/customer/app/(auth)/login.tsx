import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  getAuthMethods,
  googleLogin,
  resendEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
} from '@/lib/auth-api';
import type { AuthMethodsDto } from '@mdh/types';
import { useAppConfig, useThemeColors } from '@/providers/config-context';
import { WEBSITE_URL } from '@/lib/constants';
import { resolveAssetUrl } from '@/ui/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const config = useAppConfig();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : '/(tabs)';

  const [methods, setMethods] = useState<AuthMethodsDto | null>(null);
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'methods' | 'email' | 'otp'>('methods');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || methods?.googleClientId || undefined;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    webClientId,
    selectAccount: true,
  });

  const logoUri = resolveAssetUrl(
    config.branding.logoUrl ?? config.branding.splashLogoUrl,
    WEBSITE_URL,
  );

  useEffect(() => {
    getAuthMethods()
      .then(setMethods)
      .catch(() =>
        setMethods({
          emailOtp: true,
          google: false,
          mobileOtp: false,
          guest: true,
          otpExpirySeconds: 600,
          resendCooldownSeconds: 60,
          googleClientId: null,
        }),
      );
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        setError("We couldn't complete Google sign-in. Please try again.");
        return;
      }
      setLoading(true);
      googleLogin({ idToken })
        .then(() => router.replace(returnTo as '/(tabs)'))
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't complete Google sign-in. Please try again.",
          );
        })
        .finally(() => setLoading(false));
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setError('Google sign-in was cancelled.');
    }
  }, [response, returnTo]);

  async function handleSendEmailOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await sendEmailOtp({ email: email.trim() });
      setSessionId(res.sessionId);
      setMaskedEmail(res.maskedEmail);
      setCooldown(res.cooldownSeconds);
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't send the email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      await verifyEmailOtp({ sessionId, otp });
      router.replace(returnTo as '/(tabs)');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't verify that code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await resendEmailOtp({ sessionId });
      setCooldown(res.cooldownSeconds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't send the email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const showGoogle = Boolean(methods?.google && webClientId);

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
        {step === 'methods' ? (
          <>
            <Text style={styles.cardTitle}>Sign in</Text>
            {methods?.emailOtp !== false ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  setError(null);
                  setStep('email');
                }}
              >
                <Text style={styles.primaryBtnText}>Continue with Email OTP</Text>
              </Pressable>
            ) : null}

            {showGoogle ? (
              <Pressable
                style={styles.googleBtn}
                disabled={!request || loading}
                onPress={() => {
                  setError(null);
                  promptAsync().catch(() =>
                    setError("We couldn't complete Google sign-in. Please try again."),
                  );
                }}
              >
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </Pressable>
            ) : null}

            <View style={styles.comingSoon}>
              <Text style={styles.comingSoonTitle}>Continue with Mobile OTP</Text>
              <Text style={styles.comingSoonBody}>
                Coming soon — we&apos;re currently setting up secure mobile verification. Please use
                email or Google.
              </Text>
            </View>
          </>
        ) : null}

        {step === 'email' ? (
          <>
            <Text style={styles.cardTitle}>Email OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
              onPress={handleSendEmailOtp}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Please wait…' : 'Send OTP'}</Text>
            </Pressable>
            <Pressable onPress={() => setStep('methods')}>
              <Text style={styles.link}>Other sign-in options</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'otp' ? (
          <>
            <Text style={styles.cardTitle}>Enter OTP</Text>
            <Text style={styles.hint}>Code sent to {maskedEmail || email}</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Please wait…' : 'Verify & Continue'}
              </Text>
            </Pressable>
            <Pressable onPress={handleResend} disabled={cooldown > 0 || loading}>
              <Text style={styles.link}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setStep('email')}>
              <Text style={styles.link}>Change email</Text>
            </Pressable>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {methods?.guest !== false ? (
          <Pressable
            onPress={() =>
              router.replace(returnTo.includes('checkout') ? '/(tabs)' : (returnTo as '/(tabs)'))
            }
          >
            <Text style={styles.guest}>Continue as Guest →</Text>
          </Pressable>
        ) : null}
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
  error: { color: '#DC2626', fontSize: 13, marginTop: 8 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#1F2937', fontWeight: '700', fontSize: 16 },
  googleBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 10,
  },
  googleBtnText: { color: '#111827', fontWeight: '700', fontSize: 16 },
  comingSoon: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  comingSoonTitle: { color: '#6B7280', fontWeight: '700' },
  comingSoonBody: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  link: { color: '#14532D', textAlign: 'center', marginTop: 12, fontWeight: '600' },
  guest: { color: '#6B7280', textAlign: 'center', marginTop: 16, fontSize: 14 },
  hint: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
});
