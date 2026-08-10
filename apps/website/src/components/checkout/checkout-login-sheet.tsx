'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Smartphone } from 'lucide-react';
import { Button, Input, Label } from '@mdh/ui';
import { sendOtp, verifyOtp, isCustomer } from '@mdh/auth-client';
import { API_URL } from '@/lib/api';
import { clearUserSessionQueries } from '@/lib/auth-queries';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
    onChange(arr.join('').slice(0, length));
    if (digit && index < length - 1) inputs.current[index + 1]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
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
          className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 border-[#14532D]/15 bg-[#FFF8E8] focus:border-[#14532D] outline-none"
        />
      ))}
    </div>
  );
}

export function CheckoutLoginSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
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
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { user } = await verifyOtp(API_URL, { phone, otp });
      if (!isCustomer(user)) {
        setError('Please use a customer account');
        return;
      }
      clearUserSessionQueries(queryClient);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {step === 'phone' ? 'Login to continue' : 'Verify OTP'}
          </SheetTitle>
          <p className="text-sm text-muted-foreground pr-8">
            Your cart is saved. Login to use saved addresses and reward points.
          </p>
        </SheetHeader>

        <div className="px-5 pb-8 pt-2 overflow-y-auto">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="checkout-phone">Phone Number</Label>
                <div className="mt-2 flex rounded-2xl border-2 border-[#14532D]/10 overflow-hidden">
                  <span className="px-4 flex items-center bg-[#FFF8E8] text-[#14532D] font-semibold border-r">
                    +91
                  </span>
                  <Input
                    id="checkout-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="border-0 h-12 rounded-none"
                    inputMode="numeric"
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full h-12 rounded-2xl bg-[#14532D]"
              >
                {loading ? 'Sending...' : 'Send OTP'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <Lock className="h-3 w-3" /> Secure OTP verification
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} />
              <p className="text-xs text-center text-gray-400">Dev OTP: 123456</p>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 rounded-2xl bg-[#14532D]"
              >
                {loading ? 'Verifying...' : 'Verify & Continue Checkout'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                }}
                className="w-full text-sm text-gray-500"
              >
                Change phone number
              </button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
