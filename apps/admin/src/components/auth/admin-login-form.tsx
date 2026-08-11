'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import {
  Phone,
  Lock,
  ArrowRight,
  Loader2,
  Mail,
  Globe,
  ChevronDown,
  Eye,
  EyeOff,
  ChefHat,
  ShoppingBag,
  Monitor,
  Shield,
} from 'lucide-react';
import { Button, Input, Label } from '@mdh/ui';
import {
  login,
  sendOtp,
  verifyOtp,
  getStoredUser,
  clearAuth,
  getPostLoginRedirect,
  isAdminUser,
  ensureAuthenticated,
} from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import { OtpInput } from './otp-input';
import { BRAND } from '@mdh/utils';

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Enter a valid 10-digit phone number')
    .max(10, 'Enter a valid 10-digit phone number')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  remember: z.boolean().optional(),
});

type PhoneForm = z.infer<typeof phoneSchema>;

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

type EmailForm = z.infer<typeof emailSchema>;

const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF', 'CASHIER'];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const [authMode, setAuthMode] = useState<'email' | 'otp'>('email');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { remember: true },
  });

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { remember: true, email: 'admin@mercydosahouse.com' },
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const user = await ensureAuthenticated(API_URL);
      if (cancelled) return;

      if (user) {
        const isStaff = user.roles?.some((r) => STAFF_ROLES.includes(r));
        if (isStaff) {
          if (isAdminUser(user)) {
            router.replace('/');
            return;
          }
          window.location.href = getPostLoginRedirect(user, APP_URLS);
          return;
        }
        clearAuth();
      }

      setSessionChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const finishStaffLogin = (user: ReturnType<typeof getStoredUser>) => {
    const isStaff = user?.roles?.some((r) => STAFF_ROLES.includes(r));
    if (!isStaff) {
      clearAuth();
      setOtpError(true);
      setError(
        'This account is not authorized for admin access. Use staff credentials or admin phone 9000000001.',
      );
      return false;
    }
    toast(`Welcome back ${user?.name?.split(' ')[0] || 'Admin'}!`);
    if (isAdminUser(user)) {
      window.location.href = '/';
    } else {
      window.location.href = getPostLoginRedirect(user, APP_URLS);
    }
    return true;
  };

  const onEmailLogin = async (data: EmailForm) => {
    setLoading(true);
    setError('');
    setOtpError(false);
    try {
      await login(API_URL, { email: data.email, password: data.password });
      if (data.remember) localStorage.setItem('mdh_admin_remember', 'true');
      finishStaffLogin(getStoredUser());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async (data: PhoneForm) => {
    setLoading(true);
    setError('');
    try {
      await sendOtp(API_URL, { phone: data.phone });
      setPhone(data.phone);
      if (data.remember) localStorage.setItem('mdh_admin_remember', 'true');
      setStep('otp');
      setCountdown(30);
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      setOtpError(true);
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    setOtpError(false);
    try {
      await verifyOtp(API_URL, { phone, otp });
      finishStaffLogin(getStoredUser());
    } catch (err) {
      setOtpError(true);
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await sendOtp(API_URL, { phone });
      setCountdown(30);
      toast('OTP resent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast(`${provider} sign-in coming soon`);
  };

  const selectedLang = LANGUAGES.find((l) => l.code === language)?.label ?? 'English';

  if (!sessionChecked) {
    return (
      <main className="relative flex flex-1 flex-col min-w-0 min-h-full lg:flex-[1] lg:min-w-[480px] bg-[#f4f5f7] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#14532D]" aria-label="Checking session" />
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col min-w-0 min-h-full lg:flex-[1] lg:min-w-[480px] bg-[#f4f5f7] overflow-y-auto">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-[#0b4a2d]/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Language selector */}
      <div className="absolute top-6 right-6 xl:right-10 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Globe className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Language</span>
            <span className="font-medium text-gray-800">{selectedLang}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {langOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30"
                aria-label="Close language menu"
                onClick={() => setLangOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`flex w-full px-3 py-2 text-sm hover:bg-gray-50 ${
                      language === lang.code ? 'text-[#0b4a2d] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center items-center px-6 py-10 sm:px-10 xl:px-16">
        {/* Mobile branding */}
        <div className="lg:hidden flex items-center gap-3 mb-6 w-full max-w-[480px]">
          <Image
            src="/images/logo.png"
            alt=""
            width={48}
            height={48}
            className="rounded-full ring-2 ring-[#0b4a2d]/20"
          />
          <div>
            <p className="font-bold text-[#0b4a2d] text-lg leading-tight">{BRAND.name}</p>
            <p className="text-[#d4af37] text-xs font-semibold">Restaurant Management System</p>
          </div>
        </div>

        {/* Desktop portal header */}
        <div className="hidden lg:flex items-center gap-3 mb-6 w-full max-w-[480px]">
          <Image
            src="/images/logo.png"
            alt=""
            width={44}
            height={44}
            className="rounded-full ring-2 ring-[#0b4a2d]/15"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0b4a2d]/70">
              Staff Portal
            </p>
            <p className="font-bold text-gray-900 text-lg leading-tight">Admin Workspace</p>
          </div>
        </div>

        <div className="w-full max-w-[480px]">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0b4a2d] via-[#1a6b42] to-[#d4af37]" />
            <div className="p-9 sm:p-10">
              <p className="text-[15px] font-semibold text-[#0b4a2d] mb-1.5">Welcome Back!</p>
              <h2 className="text-[1.85rem] sm:text-[2rem] font-bold text-gray-900 leading-tight mb-1.5">
                Admin Sign In
              </h2>
              <p className="text-[15px] text-gray-500 mb-8">
                Sign in to your admin account to continue
              </p>

              <div className="flex rounded-xl bg-gray-100/90 p-1.5 mb-7">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('email');
                    setError('');
                    setOtpError(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-semibold transition-all ${
                    authMode === 'email'
                      ? 'bg-[#0b4a2d] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 bg-transparent'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    setStep('phone');
                    setError('');
                    setOtpError(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-semibold transition-all ${
                    authMode === 'otp'
                      ? 'bg-[#0b4a2d] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 bg-transparent'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Phone / OTP
                </button>
              </div>

              {authMode === 'email' ? (
                <form onSubmit={handleEmailSubmit(onEmailLogin)} className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium text-[15px]">
                      Email
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        {...registerEmail('email')}
                        placeholder="admin@mercydosahouse.com"
                        className="pl-10 h-12 text-[15px] rounded-xl border-gray-200 bg-gray-50/80 focus-visible:ring-[#0b4a2d]/15 focus-visible:border-[#0b4a2d]/30"
                      />
                    </div>
                    {emailErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700 font-medium text-[15px]">
                      Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        {...registerEmail('password')}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 text-[15px] rounded-xl border-gray-200 bg-gray-50/80 focus-visible:ring-[#0b4a2d]/15 focus-visible:border-[#0b4a2d]/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {emailErrors.password && (
                      <p className="text-xs text-red-500 mt-1">{emailErrors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2.5 text-[15px] text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...registerEmail('remember')}
                        className="h-4 w-4 rounded border-gray-300 text-[#0b4a2d] focus:ring-[#0b4a2d]/30"
                      />
                      Remember this device
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        toast('Please contact your administrator to reset your password.')
                      }
                      className="text-[15px] font-medium text-[#0b4a2d] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-[15px] rounded-xl bg-[#0b4a2d] hover:bg-[#093d26] text-white font-semibold shadow-sm gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                      </>
                    ) : (
                      <>
                        Sign In <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : step === 'phone' ? (
                <form onSubmit={handleSubmit(onSendOtp)} className="space-y-5">
                  <div>
                    <Label htmlFor="phone" className="text-gray-700 font-medium text-[15px]">
                      Phone Number
                    </Label>
                    <div className="flex mt-1.5 rounded-xl border border-gray-200 bg-gray-50/80 overflow-hidden focus-within:border-[#0b4a2d]/30 focus-within:ring-2 focus-within:ring-[#0b4a2d]/10 transition-all">
                      <span className="flex items-center px-3.5 border-r border-gray-200 text-sm font-semibold text-[#0b4a2d] shrink-0 bg-gray-100/80">
                        +91
                      </span>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          {...register('phone')}
                          placeholder="9000000001"
                          className="border-0 bg-transparent pl-9 h-12 text-[15px] rounded-none focus-visible:ring-0"
                          maxLength={10}
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <label className="flex items-center gap-2.5 text-[15px] text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register('remember')}
                      className="h-4 w-4 rounded border-gray-300 text-[#0b4a2d] focus:ring-[#0b4a2d]/30"
                    />
                    Remember this device
                  </label>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-[15px] rounded-xl bg-[#0b4a2d] hover:bg-[#093d26] text-white font-semibold shadow-sm gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        Send OTP <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    OTP sent to <span className="font-semibold text-[#0b4a2d]">+91 {phone}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                        setError('');
                      }}
                      className="ml-2 text-[#0b4a2d] font-medium hover:underline"
                    >
                      Change
                    </button>
                  </p>

                  <OtpInput value={otp} onChange={setOtp} error={otpError} />

                  {process.env.NODE_ENV !== 'production' && (
                    <p className="text-xs text-center text-gray-400 bg-gray-50 rounded-lg py-1.5">
                      Dev OTP: <span className="font-mono font-bold">123456</span>
                    </p>
                  )}

                  <p className="text-center text-sm text-gray-500">
                    {countdown > 0 ? (
                      <>
                        Resend OTP in{' '}
                        <span className="font-semibold text-[#0b4a2d]">{countdown}s</span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={resendOtp}
                        className="text-[#0b4a2d] font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </p>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center">
                      {error}
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={onVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full h-12 text-[15px] rounded-xl bg-[#0b4a2d] hover:bg-[#093d26] text-white font-semibold gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Sign In <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Social login — email mode only, phone step 1 only */}
              {(authMode === 'email' || (authMode === 'otp' && step === 'phone')) && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-gray-400">or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('Google')}
                      className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('Microsoft')}
                      className="flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <MicrosoftIcon className="h-4 w-4" />
                      Microsoft
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Secure login protected by advanced encryption.
              </div>
            </div>
          </div>

          {/* Dev credentials hint */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 rounded-xl border border-[#0b4a2d]/15 bg-[#0b4a2d]/[0.04] px-4 py-3 text-xs text-gray-600">
              <p className="font-semibold text-[#0b4a2d] mb-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Demo credentials
              </p>
              <p>
                Email: <span className="font-mono">admin@mercydosahouse.com</span> · Password:{' '}
                <span className="font-mono">Admin@12345</span>
              </p>
              <p className="mt-1">
                Phone OTP: <span className="font-mono">9000000001</span> · OTP:{' '}
                <span className="font-mono">123456</span>
              </p>
            </div>
          )}

          {/* Quick access after login */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Monitor, label: 'POS', href: '/pos' },
              { icon: ChefHat, label: 'Kitchen', href: '/kitchen' },
              { icon: ShoppingBag, label: 'Orders', href: '/orders' },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-2 py-3 text-center text-[11px] font-semibold text-gray-600 hover:border-[#0b4a2d]/30 hover:text-[#0b4a2d] hover:bg-white transition-colors shadow-sm"
              >
                <Icon className="h-4 w-4 text-[#0b4a2d]/70" />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
