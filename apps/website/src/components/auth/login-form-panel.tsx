'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPostLoginRedirect, isCustomer, type AuthUser } from '@mdh/auth-client';
import { APP_URLS } from '@/lib/app-urls';
import { clearUserSessionQueries } from '@/lib/auth-queries';
import { getSafeRedirect } from '@/lib/auth-redirect';
import { CustomerLoginForm } from './customer-login-form';

const TRUST_BADGES = [
  { icon: Shield, label: 'Secure OTP Verification' },
  { icon: Zap, label: 'Fast Quick Access' },
  { icon: Lock, label: '100% Safe' },
];

export function LoginFormPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const fromCheckout = redirectTo === '/checkout';

  const handleAuthenticated = useCallback(
    async (user: AuthUser) => {
      clearUserSessionQueries(queryClient);
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
    },
    [queryClient, redirectTo, router],
  );

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-10 lg:py-12 bg-[#FFF8E8] min-h-[calc(100vh-4.5rem)]">
      <div className="hidden lg:block absolute bottom-8 right-8 pointer-events-none select-none opacity-70">
        <span className="text-3xl absolute bottom-0 right-0">🌿</span>
        <span className="text-2xl absolute bottom-6 right-10">🌶️</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="w-full max-w-[440px]"
      >
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14532D]/10 mb-3">
            <Mail className="w-7 h-7 text-[#14532D]" />
          </div>
          <h1 className="text-2xl font-bold text-[#14532D]">Mercy Dosa House</h1>
          <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-widest mt-1">
            Authentic South Indian Flavours
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(20,83,45,0.12)] border border-[#14532D]/5 overflow-hidden">
          <div className="pt-8 pb-4 px-8 text-center">
            <div className="hidden lg:flex items-center justify-center w-14 h-14 rounded-2xl bg-[#14532D]/8 mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#14532D]" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#14532D] font-[family-name:var(--font-poppins)]">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              {fromCheckout
                ? 'Log in to use your saved name and delivery address at checkout.'
                : 'Sign in with email OTP or Google. Mobile OTP is coming soon.'}
            </p>
          </div>

          <div className="px-8 pb-6">
            <CustomerLoginForm
              onAuthenticated={handleAuthenticated}
              guestHref={redirectTo || '/'}
              fromCheckout={fromCheckout}
            />
          </div>

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
