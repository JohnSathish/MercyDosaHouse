'use client';

import { motion } from 'framer-motion';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { AdminLoginForm } from '@/components/auth/admin-login-form';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a2918]">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5'%3E%3Cpath d='M0 24h48M24 0v48'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2918] via-[#14532D] to-[#1a4d2e] pointer-events-none" />

      {/* Ambient glows */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#22c55e]/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 11, delay: 1.5, ease: 'easeInOut' }}
        className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -24, 0], opacity: [0.15, 0.3, 0.15] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]">
        <LoginBrandingPanel />
        <AdminLoginForm />
      </div>
    </div>
  );
}
