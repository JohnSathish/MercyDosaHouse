'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Shield,
  Lock,
  ArrowRight,
  Loader2,
  Check,
  Moon,
  Sun,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Label } from '@mdh/ui';
import {
  sendOtp,
  verifyOtp,
  getStoredUser,
  clearAuth,
  getPostLoginRedirect,
  isAdminUser,
} from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { useToastStore } from '@/lib/toast-store';
import { OtpInput } from './otp-input';
import Image from 'next/image';
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

const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF', 'CASHIER'];

const TRUST_FEATURES = [
  { icon: Shield, text: 'Secure Login' },
  { icon: Sparkles, text: 'Fast Authentication' },
  { icon: Lock, text: 'OTP Verification' },
  { icon: Check, text: 'End-to-End Security' },
];

export function AdminLoginForm() {
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { remember: true },
  });

  useEffect(() => {
    const prefersDark = localStorage.getItem('mdh_admin_dark') === 'true';
    setDarkMode(prefersDark);
    if (prefersDark) document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('mdh_admin_dark', String(next));
    document.documentElement.classList.toggle('dark', next);
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
      const user = getStoredUser();
      const isStaff = user?.roles?.some((r) => STAFF_ROLES.includes(r));
      if (!isStaff) {
        clearAuth();
        setOtpError(true);
        setError('This phone number is not authorized for admin access.');
        return;
      }
      toast(`Welcome back ${user?.name?.split(' ')[0] || 'Admin'}!`);
      if (isAdminUser(user)) {
        router.push('/');
      } else {
        window.location.href = getPostLoginRedirect(user, APP_URLS);
      }
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

  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';

  return (
    <div className="flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 w-full min-h-screen lg:min-h-0">
      {/* Mobile branding */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden flex items-center gap-3 mb-6 w-full max-w-[440px]"
      >
        <Image
          src="/images/logo.png"
          alt=""
          width={52}
          height={52}
          className="rounded-full ring-2 ring-white/30"
        />
        <div>
          <p className="font-bold text-white text-lg leading-tight">{BRAND.name}</p>
          <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-wider">
            Admin Dashboard
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-[440px]"
      >
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {(['phone', 'otp'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === s || (step === 'otp' && s === 'phone')
                    ? 'bg-[#F59E0B] text-[#1F2937] shadow-lg'
                    : 'bg-white/15 text-white/60'
                }`}
              >
                {step === 'otp' && s === 'phone' ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i === 0 && (
                <div
                  className={`h-0.5 w-10 rounded-full ${step === 'otp' ? 'bg-[#F59E0B]' : 'bg-white/20'}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="relative rounded-3xl border border-white/20 bg-white/[0.97] dark:bg-gray-900/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#14532D] via-[#22c55e] to-[#F59E0B]" />

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {step === 'phone' ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-2xl sm:text-[1.65rem] font-bold text-[#14532D] dark:text-white mb-1">
                    Welcome Back 👋
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    Sign in to continue to {BRAND.name} Admin Dashboard.
                  </p>

                  <form onSubmit={handleSubmit(onSendOtp)} className="space-y-5">
                    <div>
                      <Label
                        htmlFor="phone"
                        className="text-gray-700 dark:text-gray-300 font-semibold text-sm"
                      >
                        Phone Number
                      </Label>
                      <div className="flex mt-2 rounded-2xl border-2 border-[#14532D]/10 bg-[#FFF8E8]/80 dark:bg-gray-800/80 overflow-hidden focus-within:border-[#14532D] focus-within:ring-2 focus-within:ring-[#14532D]/15 transition-all">
                        <span className="flex items-center px-4 border-r border-[#14532D]/10 text-sm font-bold text-[#14532D] dark:text-[#F59E0B] shrink-0">
                          +91
                        </span>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="phone"
                            {...register('phone')}
                            placeholder="9000000001"
                            className="border-0 bg-transparent pl-10 h-12 rounded-none focus-visible:ring-0 text-base"
                            maxLength={10}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                      {errors.phone && (
                        <p className="text-xs text-red-500 mt-1.5">{errors.phone.message}</p>
                      )}
                    </div>

                    <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        {...register('remember')}
                        className="h-4 w-4 rounded border-[#14532D]/30 text-[#14532D] focus:ring-[#14532D]/30"
                      />
                      Remember this device
                    </label>

                    {error && (
                      <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] hover:from-[#1a6b3c] hover:to-[#14532D] text-white font-semibold shadow-lg shadow-[#14532D]/25 hover:shadow-xl transition-all gap-2 active:scale-[0.98]"
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
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-xl font-bold text-[#14532D] dark:text-white mb-1">
                    Enter Verification Code
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    OTP sent to{' '}
                    <span className="font-semibold text-[#14532D] dark:text-[#F59E0B]">
                      +91 {phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtp('');
                        setError('');
                      }}
                      className="ml-2 text-[#14532D] dark:text-[#F59E0B] font-medium hover:underline"
                    >
                      Change
                    </button>
                  </p>

                  <OtpInput value={otp} onChange={setOtp} error={otpError} />

                  {process.env.NODE_ENV !== 'production' && (
                    <p className="text-xs text-center text-gray-400 mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg py-1.5">
                      Dev OTP: <span className="font-mono font-bold">123456</span>
                    </p>
                  )}

                  <p className="text-center text-sm text-gray-500 mt-4">
                    {countdown > 0 ? (
                      <>
                        Resend OTP in{' '}
                        <span className="font-semibold text-[#14532D]">{countdown}s</span>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={resendOtp}
                        className="text-[#14532D] dark:text-[#F59E0B] font-semibold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </p>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-xl px-3 py-2 text-center mt-3">
                      {error}
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={onVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full h-12 mt-6 rounded-2xl bg-gradient-to-r from-[#14532D] to-[#1a6b3c] text-white font-semibold gap-2 shadow-lg active:scale-[0.98] transition-transform"
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
                </motion.div>
              )}
            </AnimatePresence>

            {step === 'phone' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-white dark:bg-gray-900 px-3 text-gray-400">or</span>
                  </div>
                </div>

                <Link href={websiteUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-700 font-semibold hover:bg-[#FFF8E8] dark:hover:bg-gray-800 gap-2"
                  >
                    Continue as Guest
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </Link>
              </>
            )}

            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-500 dark:text-gray-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Your login is secured using OTP authentication.
            </div>

            <button
              type="button"
              onClick={toggleDark}
              className="mt-4 mx-auto flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-x-4 gap-y-3 mt-8 w-full max-w-[440px]"
      >
        {TRUST_FEATURES.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-xl bg-white/8 border border-white/10 px-3 py-2.5 backdrop-blur-sm"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/20">
              <Icon className="w-3.5 h-3.5 text-[#F59E0B]" />
            </div>
            <span className="text-xs font-medium text-white/85">{text}</span>
          </div>
        ))}
      </motion.div>

      <div className="flex items-center gap-2 mt-6 text-white/50 text-xs">
        <Shield className="w-4 h-4 text-[#F59E0B]/80" />
        Enterprise-grade security
      </div>
    </div>
  );
}
