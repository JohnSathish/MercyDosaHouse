'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight, UserRound, Lock, Shield, Zap, ChevronDown } from 'lucide-react';
import { Button, Input, Label } from '@mdh/ui';
import { sendOtp, verifyOtp, getPostLoginRedirect, isCustomer } from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import { getSafeRedirect } from '@/lib/auth-redirect';

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
          className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border-2 border-[#14532D]/15 bg-[#FFF8E8] focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20 outline-none transition-all"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

const TRUST_BADGES = [
  { icon: Shield, label: 'Secure OTP Verification' },
  { icon: Zap, label: 'Fast Quick Access' },
  { icon: Lock, label: '100% Safe' },
];

export function LoginFormPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const fromCheckout = redirectTo === '/checkout';
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendOtp(API_URL, { phone });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { user } = await verifyOtp(API_URL, { phone, otp });
      const returnPath = redirectTo && isCustomer(user) ? redirectTo : null;
      if (returnPath) {
        router.push(returnPath);
        return;
      }
      const redirect = getPostLoginRedirect(user, APP_URLS);
      if (redirect.startsWith('http')) {
        window.location.href = redirect;
      } else {
        router.push(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-10 lg:py-12 bg-[#FFF8E8] min-h-[calc(100vh-4.5rem)]">
      {/* Decorative spices — desktop only */}
      <div className="hidden lg:block absolute bottom-8 right-8 pointer-events-none select-none opacity-70">
        <span className="text-3xl absolute bottom-0 right-0">🌿</span>
        <span className="text-2xl absolute bottom-6 right-10">🌶️</span>
        <span className="text-xs absolute bottom-2 right-16 text-amber-800/60 font-bold tracking-widest">
          • • •
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="w-full max-w-[440px]"
      >
        {/* Mobile branding header */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14532D]/10 mb-3">
            <Smartphone className="w-7 h-7 text-[#14532D]" />
          </div>
          <h1 className="text-2xl font-bold text-[#14532D]">Mercy Dosa House</h1>
          <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-widest mt-1">
            Authentic South Indian Flavours
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(20,83,45,0.12)] border border-[#14532D]/5 overflow-hidden">
          {/* Card header */}
          <div className="pt-8 pb-4 px-8 text-center">
            <div className="hidden lg:flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14532D]/8 mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-[#14532D]" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#14532D] font-[family-name:var(--font-poppins)]">
              {step === 'phone' ? 'Login with Phone' : 'Verify OTP'}
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              {step === 'phone'
                ? fromCheckout
                  ? 'Log in to use your saved name and delivery address at checkout.'
                  : "We'll send you a One Time Password (OTP) to verify your number."
                : `Enter the 6-digit code sent to +91 ${phone}`}
            </p>
          </div>

          <div className="px-8 pb-6">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-[#1F2937]">
                    Phone Number
                  </Label>
                  <div className="mt-2 flex rounded-2xl border-2 border-[#14532D]/10 bg-[#FFF8E8] overflow-hidden focus-within:border-[#14532D] focus-within:ring-2 focus-within:ring-[#14532D]/15 transition-all">
                    <div className="flex items-center gap-1 px-4 border-r border-[#14532D]/10 bg-[#FFF8E8] text-[#14532D] font-semibold shrink-0">
                      <span className="text-sm">+91</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter your phone number"
                      className="border-0 bg-transparent h-14 text-base focus-visible:ring-0 rounded-none"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full min-h-[52px] rounded-2xl bg-[#14532D] hover:bg-[#14532D]/90 text-white font-semibold text-base shadow-lg shadow-[#14532D]/20 active:scale-[0.98] transition-transform gap-2"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <OtpInput value={otp} onChange={setOtp} />
                <p className="text-xs text-gray-400 text-center">Dev OTP: 123456</p>
                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full min-h-[52px] rounded-2xl bg-[#14532D] hover:bg-[#14532D]/90 text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="w-full text-sm text-gray-500 hover:text-[#14532D] min-h-[44px]"
                >
                  Change phone number
                </button>
              </form>
            )}

            {step === 'phone' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Or
                    </span>
                  </div>
                </div>

                <Link href={redirectTo || '/'} className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-[52px] rounded-2xl border-2 border-[#14532D]/25 text-[#14532D] font-semibold hover:bg-[#14532D]/5 gap-2 active:scale-[0.98] transition-transform"
                  >
                    <UserRound className="w-4 h-4" />
                    {fromCheckout ? 'Continue without login' : 'Continue as Guest'}
                  </Button>
                </Link>

                <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-5">
                  <Lock className="w-3.5 h-3.5" />
                  Your data is safe and secure with us.
                </p>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="border-t border-gray-100 bg-[#FAFAF8] px-6 py-4 grid grid-cols-3 gap-2">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14532D]/8">
                  <Icon className="w-3.5 h-3.5 text-[#14532D]" />
                </div>
                <span className="text-[10px] font-medium text-gray-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Made with <span className="text-red-400">❤️</span> for food lovers
        </p>
      </motion.div>
    </div>
  );
}
