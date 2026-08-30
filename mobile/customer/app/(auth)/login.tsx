import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ErrorBoundary } from '@/components/error-boundary';
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

function idTokenFromAuthUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const fromQuery = parsed.queryParams?.idToken ?? parsed.queryParams?.id_token;
  const token = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (typeof token === 'string' && token.length > 0) return token;
  try {
    const hash = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
    const hashParams = new URLSearchParams(hash);
    return hashParams.get('idToken') || hashParams.get('id_token');
  } catch {
    return null;
  }
}

function GoogleSignInButton({
  loading,
  returnTo,
  onError,
  onLoading,
}: {
  loading: boolean;
  returnTo: string;
  onError: (message: string | null) => void;
  onLoading: (value: boolean) => void;
}) {
  async function startGoogleSignIn() {
    onError(null);
    onLoading(true);
    try {
      const redirectUri = 'mercydosa://google-auth';
      const authUrl = `${WEBSITE_URL}/auth/google-native?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        onError('Google sign-in was cancelled.');
        return;
      }
      if (result.type !== 'success') {
        onError("Google sign-in couldn't be completed. Please try again.");
        return;
      }
      const idToken = idTokenFromAuthUrl(result.url);
      if (!idToken) {
        onError("Google sign-in couldn't be completed. Please try again.");
        return;
      }
      await googleLogin({ idToken });
      router.replace(returnTo as '/(tabs)');
    } catch (err) {
      onError(friendlyAuthError(err, "Google sign-in couldn't be completed. Please try again."));
    } finally {
      onLoading(false);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
      disabled={loading}
      onPress={() => {
        void startGoogleSignIn();
      }}
    >
      <Text style={styles.googleMark}>G</Text>
      <Text style={styles.googleBtnText}>
        {loading ? 'Signing you in…' : 'Continue with Google'}
      </Text>
    </Pressable>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function friendlyAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('email') && (message.includes('valid') || message.includes('format'))) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('expired') || message.includes('expire')) {
    return 'This code has expired. Please request a new one.';
  }
  if (
    message.includes('attempt') ||
    message.includes('too many') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('google')) {
    return "Google sign-in couldn't be completed. Please try again.";
  }
  if (
    message.includes('send') ||
    message.includes('email') ||
    message.includes('503') ||
    message.includes('502')
  ) {
    return "We couldn't send the verification code. Please try again.";
  }
  if (message.includes('otp') || message.includes('code') || message.includes('invalid')) {
    return "That code doesn't match. Please try again.";
  }
  return fallback;
}

export default function LoginScreen() {
  return (
    <ErrorBoundary>
      <LoginScreenBody />
    </ErrorBoundary>
  );
}

function LoginScreenBody() {
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

  async function handleSendEmailOtp() {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
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
      setError(friendlyAuthError(err, "We couldn't send the verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyEmailOtp({ sessionId, otp });
      router.replace(returnTo as '/(tabs)');
    } catch (err) {
      setError(friendlyAuthError(err, "That code doesn't match. Please try again."));
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
      setError(friendlyAuthError(err, "We couldn't send the verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  const showGoogle = Boolean(methods?.google && webClientId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={{ uri: `${WEBSITE_URL}/images/hero-dosa.png` }}
        resizeMode="cover"
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={logoUri ? { uri: logoUri } : require('../../assets/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.eyebrow}>TASTE OF SOUTH INDIA</Text>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.tagline}>Sign in with email OTP or Google.</Text>
            <Text style={styles.comingSoonNote}>Mobile OTP is coming soon.</Text>
          </View>

          <View style={styles.card}>
            {step === 'methods' ? (
              <>
                {methods?.emailOtp !== false ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.secondary },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setError(null);
                      setStep('email');
                    }}
                  >
                    <View style={styles.iconBubble}>
                      <Text style={styles.iconText}>✉</Text>
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={styles.primaryBtnText}>Continue with Email OTP</Text>
                      <Text style={styles.actionHint}>We&apos;ll send a secure 6-digit code.</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ) : null}

                {!methods ? (
                  <View style={styles.googleUnavailable}>
                    <ActivityIndicator color="#14532D" />
                  </View>
                ) : showGoogle && webClientId ? (
                  <ErrorBoundary
                    fallback={
                      <View style={styles.googleUnavailable} accessibilityRole="text">
                        <Text style={styles.googleMarkMuted}>G</Text>
                        <View style={styles.actionCopy}>
                          <Text style={styles.googleUnavailableTitle}>Continue with Google</Text>
                          <Text style={styles.googleUnavailableBody}>
                            Google sign-in could not start. Use Email OTP.
                          </Text>
                        </View>
                      </View>
                    }
                  >
                    <GoogleSignInButton
                      loading={loading}
                      returnTo={returnTo}
                      onError={setError}
                      onLoading={setLoading}
                    />
                  </ErrorBoundary>
                ) : (
                  <View style={styles.googleUnavailable} accessibilityRole="text">
                    <Text style={styles.googleMarkMuted}>G</Text>
                    <View style={styles.actionCopy}>
                      <Text style={styles.googleUnavailableTitle}>Continue with Google</Text>
                      <Text style={styles.googleUnavailableBody}>
                        Temporarily unavailable — setup is pending.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.comingSoon}>
                  <View style={styles.iconBubbleMuted}>
                    <Text style={styles.iconTextMuted}>▯</Text>
                  </View>
                  <View style={styles.actionCopy}>
                    <View style={styles.row}>
                      <Text style={styles.comingSoonTitle}>Continue with Mobile OTP</Text>
                      <Text style={styles.badge}>Coming Soon</Text>
                    </View>
                    <Text style={styles.comingSoonBody}>
                      We&apos;re setting up secure mobile verification. Please use Email OTP or
                      Google.
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {step === 'email' ? (
              <>
                <Text style={styles.cardTitle}>Enter your email</Text>
                <Text style={styles.hint}>We&apos;ll send a secure 6-digit verification code.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Email address"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.secondary },
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSendEmailOtp}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#173B28" /> : null}
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Sending code…' : 'Send OTP  →'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setStep('methods')} style={styles.secondaryLinkButton}>
                  <Text style={styles.link}>Other sign-in options</Text>
                </Pressable>
              </>
            ) : null}

            {step === 'otp' ? (
              <>
                <Text style={styles.cardTitle}>Enter verification code</Text>
                <Text style={styles.hint}>Code sent to {maskedEmail || email}</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  accessibilityLabel="Six digit verification code"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.secondary },
                    pressed && styles.pressed,
                  ]}
                  onPress={handleVerify}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <ActivityIndicator color="#173B28" /> : null}
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Verifying…' : 'Verify & Login  →'}
                  </Text>
                </Pressable>
                <Pressable onPress={handleResend} disabled={cooldown > 0 || loading}>
                  <Text style={[styles.link, cooldown > 0 && styles.disabledLink]}>
                    {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend OTP'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setStep('email')}>
                  <Text style={styles.secondaryLink}>Change email</Text>
                </Pressable>
              </>
            ) : null}

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {methods?.guest !== false ? (
              <Pressable
                style={({ pressed }) => [styles.guestBtn, pressed && styles.pressed]}
                onPress={() =>
                  router.replace(
                    returnTo.includes('checkout') ? '/(tabs)' : (returnTo as '/(tabs)'),
                  )
                }
              >
                <Text style={styles.guestIcon}>♙</Text>
                <Text style={styles.guest}>Continue as Guest</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.lockIcon}>▣</Text>
            <Text style={styles.securityText}>Your data is safe and secure with us.</Text>
          </View>
          <View style={styles.footerTrust}>
            <TrustItem icon="♢" label="Secure OTP" />
            <TrustItem icon="ϟ" label="Fast Quick" />
            <TrustItem icon="▣" label="Protected" />
          </View>
          <Text style={styles.footer}>Made with ❤️ for food lovers</Text>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.trustItem}>
      <Text style={styles.trustIcon}>{icon}</Text>
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E8' },
  backgroundImage: { flex: 1 },
  backgroundImageStyle: { opacity: 0.07 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  logoImg: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  eyebrow: {
    color: '#C17A08',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  title: { color: '#14532D', fontSize: 30, fontWeight: '800', marginTop: 10 },
  tagline: { color: '#6B7280', marginTop: 7, fontSize: 14 },
  comingSoonNote: { color: '#C17A08', marginTop: 4, fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#14532D', marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(20,83,45,0.15)',
    borderRadius: 15,
    backgroundColor: '#FFF8E8',
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 16,
    marginTop: 14,
    marginBottom: 12,
    color: '#1F2937',
  },
  otpInput: { textAlign: 'center', letterSpacing: 7, fontWeight: '800' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  errorIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: '#DC2626',
    fontWeight: '800',
  },
  error: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    borderRadius: 15,
    minHeight: 56,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#173B28', fontWeight: '800', fontSize: 15 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20, color: '#14532D' },
  iconBubbleMuted: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTextMuted: { fontSize: 20, color: '#9CA3AF' },
  actionCopy: { flex: 1 },
  actionHint: { color: '#5B6B60', fontSize: 11, marginTop: 2 },
  chevron: { color: '#14532D', fontSize: 27, lineHeight: 30 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  googleBtn: {
    borderRadius: 15,
    minHeight: 54,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  googleMark: { color: '#4285F4', fontSize: 22, fontWeight: '800' },
  googleBtnText: { color: '#111827', fontWeight: '700', fontSize: 15 },
  googleUnavailable: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
  },
  googleMarkMuted: { color: '#9CA3AF', fontSize: 22, fontWeight: '800', marginRight: 12 },
  googleUnavailableTitle: { color: '#6B7280', fontWeight: '700', fontSize: 15 },
  googleUnavailableBody: { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 3 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 15,
    padding: 13,
    backgroundColor: '#F9FAFB',
    marginTop: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  comingSoonTitle: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  comingSoonBody: { color: '#9CA3AF', fontSize: 11, lineHeight: 16, marginTop: 4 },
  badge: {
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: '800',
  },
  secondaryLinkButton: { minHeight: 44, justifyContent: 'center' },
  link: { color: '#14532D', textAlign: 'center', marginTop: 7, fontWeight: '700', fontSize: 14 },
  secondaryLink: { color: '#6B7280', textAlign: 'center', marginTop: 12, fontSize: 13 },
  disabledLink: { color: '#9CA3AF' },
  guestBtn: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(20,83,45,0.35)',
    marginTop: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  guestIcon: { color: '#14532D', fontSize: 19 },
  guest: { color: '#14532D', textAlign: 'center', fontWeight: '800', fontSize: 14, flex: 1 },
  hint: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 14,
  },
  lockIcon: { color: '#14532D', fontSize: 16 },
  securityText: { color: '#6B7280', fontSize: 12 },
  footerTrust: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(193,122,8,0.16)',
  },
  trustItem: { alignItems: 'center', gap: 3, flex: 1 },
  trustIcon: { color: '#14532D', fontSize: 17 },
  trustLabel: { color: '#6B7280', fontSize: 10, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#8A7656', fontSize: 12, marginTop: 18 },
});
