'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPostLoginRedirect, isCustomer, type AuthUser } from '@mdh/auth-client';
import { APP_URLS } from '@/lib/app-urls';
import { clearUserSessionQueries } from '@/lib/auth-queries';
import { getSafeRedirect } from '@/lib/auth-redirect';
import { SiteLogoMark } from '@/components/site-logo';
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
    <div className="relative flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden bg-[#FFF8E8] px-4 py-8 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-[#F59E0B]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#14532D]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[url('/images/hero-dosa.png')] bg-cover bg-center opacity-[0.06] mix-blend-multiply lg:hidden" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 w-full max-w-[560px]"
      >
        <div className="overflow-hidden rounded-[28px] border border-[#14532D]/10 bg-white shadow-[0_24px_70px_rgba(20,83,45,0.16)]">
          <div className="px-5 pb-5 pt-7 text-center sm:px-10 sm:pb-6 sm:pt-9">
            <div className="mb-4 flex justify-center">
              <SiteLogoMark size="lg" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C17A08]">
              Taste of South India
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-poppins)] text-[2rem] font-bold leading-tight text-[#14532D] sm:text-4xl">
              Welcome back <span aria-hidden="true">👋</span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
              {fromCheckout
                ? 'Log in to use your saved name and delivery address at checkout.'
                : 'Sign in with Email OTP or Google.'}
            </p>
            {!fromCheckout ? (
              <p className="mt-1 text-xs font-medium text-[#C17A08]">Mobile OTP is coming soon.</p>
            ) : null}
          </div>

          <div className="px-5 pb-6 sm:px-10 sm:pb-8">
            <CustomerLoginForm
              onAuthenticated={handleAuthenticated}
              guestHref={redirectTo || '/'}
              fromCheckout={fromCheckout}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 bg-[#FAFAF8] px-4 py-4 sm:px-8">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14532D]/[0.08]">
                  <Icon className="w-3.5 h-3.5 text-[#14532D]" />
                </div>
                <span className="text-[10px] font-medium leading-tight text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          Made with <span className="text-red-400">❤️</span> for food lovers
        </p>
      </motion.div>
    </div>
  );
}
