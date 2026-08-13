'use client';

import { Suspense } from 'react';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { AdminLoginForm } from '@/components/auth/admin-login-form';
import { BRAND } from '@mdh/utils';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7]">
      <div className="flex flex-1 min-h-0 w-full flex-row overflow-hidden">
        <LoginBrandingPanel />
        <Suspense fallback={<div className="flex-1 bg-white" />}>
          <AdminLoginForm />
        </Suspense>
      </div>
      <footer className="shrink-0 py-3.5 text-center text-[11px] text-gray-400 bg-[#f4f5f7] border-t border-gray-200/60">
        © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
      </footer>
    </div>
  );
}
