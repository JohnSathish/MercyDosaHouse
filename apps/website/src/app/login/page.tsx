'use client';

import { Suspense } from 'react';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { LoginFormPanel } from '@/components/auth/login-form-panel';

function LoginFormFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#FFF8E8] min-h-[calc(100vh-4.5rem)]">
      <p className="text-sm text-gray-500">Loading login...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-[calc(100vh-4.5rem)] overflow-hidden">
      <LoginBrandingPanel />
      <Suspense fallback={<LoginFormFallback />}>
        <LoginFormPanel />
      </Suspense>
    </div>
  );
}
