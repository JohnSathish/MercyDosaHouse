'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  Mail,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { Button, Input, Label } from '@mdh/ui';
import {
  getAuthMethods,
  googleLogin,
  resendEmailOtp,
  sendEmailOtp,
  verifyEmailOtp,
  type AuthMethodsDto,
  type AuthUser,
} from '@mdh/auth-client';
import { API_URL } from '@/lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: { theme: string; size: string; width: number; text: string; shape: string },
          ) => void;
        };
      };
    };
  }
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

function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[index] = digit;
    const next = arr.join('').slice(0, length);
    onChange(next);
    if (digit && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className="h-14 w-11 rounded-2xl border-2 border-[#14532D]/15 bg-[#FFF8E8] text-center text-xl font-bold outline-none transition-all focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20 sm:w-12"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function GoogleSignInButton({
  clientId,
  onCredential,
  disabled,
}: {
  clientId: string;
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
      hostRef.current.innerHTML = '';
      const availableWidth = hostRef.current.clientWidth;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) onCredential(response.credential);
        },
      });
      window.google.accounts.id.renderButton(hostRef.current, {
        theme: 'outline',
        size: 'large',
        width: availableWidth ? Math.min(360, availableWidth) : 360,
        text: 'continue_with',
        shape: 'pill',
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector('script[data-mdh-google-gsi]');
    if (existing) {
      existing.addEventListener('load', render);
      return () => {
        cancelled = true;
        existing.removeEventListener('load', render);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.mdhGoogleGsi = 'true';
    script.addEventListener('load', render);
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.removeEventListener('load', render);
    };
  }, [clientId, disabled, onCredential]);

  return <div ref={hostRef} className="flex justify-center min-h-[44px] overflow-hidden" />;
}

export function CustomerLoginForm({
  onAuthenticated,
  guestHref,
  guestLabel,
  compact,
  fromCheckout,
}: {
  onAuthenticated: (user: AuthUser) => void | Promise<void>;
  guestHref?: string;
  guestLabel?: string;
  compact?: boolean;
  fromCheckout?: boolean;
}) {
  const [methods, setMethods] = useState<AuthMethodsDto | null>(null);
  const [step, setStep] = useState<'methods' | 'email' | 'otp'>('methods');
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAuthMethods(API_URL)
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

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setLoading(true);
      setError('');
      try {
        const { user } = await googleLogin(API_URL, { idToken });
        await onAuthenticated(user);
      } catch (err) {
        setError(friendlyAuthError(err, "Google sign-in couldn't be completed. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [onAuthenticated],
  );

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await sendEmailOtp(API_URL, { email: email.trim() });
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
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await verifyEmailOtp(API_URL, { sessionId, otp });
      await onAuthenticated(user);
    } catch (err) {
      setError(friendlyAuthError(err, "That code doesn't match. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await resendEmailOtp(API_URL, { sessionId });
      setCooldown(res.cooldownSeconds);
    } catch (err) {
      setError(friendlyAuthError(err, "We couldn't send the verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const showGuest = methods?.guest !== false;
  const showGoogle = Boolean(methods?.google && methods.googleClientId);
  const emailEnabled = methods?.emailOtp !== false;

  return (
    <div className="space-y-4">
      {step === 'methods' && (
        <>
          {emailEnabled && (
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setError('');
              }}
              className="group w-full rounded-2xl border-2 border-[#14532D]/15 bg-[#FFF8E8] p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#14532D] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14532D]/15"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#14532D]/10">
                  <Mail className="h-5 w-5 text-[#14532D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14532D]">Continue with Email OTP</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    We&apos;ll send a secure 6-digit code to your inbox.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#14532D] transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          )}

          {showGoogle && (
            <div
              className={`mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white px-2 py-2 shadow-sm transition-shadow hover:shadow-md ${
                loading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <GoogleSignInButton
                clientId={methods!.googleClientId!}
                onCredential={handleGoogleCredential}
                disabled={loading}
              />
            </div>
          )}

          {!showGoogle && (
            <div
              className="mt-3 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 opacity-80"
              aria-disabled="true"
              role="status"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-200 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-500">Continue with Google</p>
                  <p className="text-xs text-gray-400">
                    Temporarily unavailable — Google sign-in setup is pending.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
              or
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <div
            className="mt-4 w-full cursor-not-allowed rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 opacity-80"
            aria-disabled="true"
            role="status"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200">
                <Smartphone className="h-5 w-5 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-500">Continue with Mobile OTP</p>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  We&apos;re currently setting up secure mobile verification. Please use Email OTP
                  or Google for now.
                </p>
              </div>
            </div>
          </div>

          {showGuest && guestHref && (
            <Link href={guestHref} className="block">
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-[52px] w-full gap-2 rounded-2xl border-2 border-[#14532D]/25 font-semibold text-[#14532D] transition-all hover:-translate-y-0.5 hover:bg-[#14532D]/5 hover:shadow-sm"
              >
                <UserRound className="w-4 h-4" />
                {guestLabel || (fromCheckout ? 'Continue without login' : 'Continue as Guest')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </>
      )}

      {step === 'email' && (
        <form onSubmit={handleSendEmailOtp} className="space-y-4">
          <div>
            <Label htmlFor="customer-email" className="text-sm font-semibold text-[#1F2937]">
              Email address
            </Label>
            <Input
              id="customer-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-14 rounded-2xl border-2 border-[#14532D]/10 bg-[#FFF8E8]"
              required
            />
          </div>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            type="submit"
            disabled={loading || !isValidEmail(email)}
            className="min-h-[52px] w-full gap-2 rounded-2xl bg-[#14532D] font-semibold text-white shadow-sm transition-all hover:bg-[#14532D]/90 hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending code…
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('methods');
              setError('');
            }}
            className="w-full text-sm text-gray-500 min-h-[44px]"
          >
            Other sign-in options
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Enter the 6-digit code sent to {maskedEmail || email}
          </p>
          <OtpInput value={otp} onChange={setOtp} />
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="min-h-[52px] w-full gap-2 rounded-2xl bg-[#14532D] font-semibold text-white shadow-sm transition-all hover:bg-[#14532D]/90 hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                Verify &amp; Login
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <button
            type="button"
            disabled={loading || cooldown > 0}
            onClick={handleResend}
            className="w-full text-sm text-[#14532D] font-medium min-h-[44px] disabled:text-gray-400"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError('');
            }}
            className="w-full text-sm text-gray-500 min-h-[44px]"
          >
            Change email
          </button>
        </form>
      )}

      {!compact && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Your data is safe and secure with us.
        </p>
      )}
    </div>
  );
}
