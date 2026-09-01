import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { BusinessSettingsDto } from '@mdh/types';

const FSSAI_FALLBACK = '21726006000529';

export function CompactFssaiCard({ settings }: { settings: BusinessSettingsDto | null }) {
  if (settings?.fssaiEnabled === false) return null;
  const registrationNumber = settings?.fssaiRegistrationNumber?.trim() || FSSAI_FALLBACK;

  return (
    <Link
      href="/fssai"
      className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 shadow-sm transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
    >
      <ShieldCheck className="h-5 w-5 shrink-0 text-[#14532D]" aria-hidden />
      <div className="min-w-0">
        <p className="font-bold text-[#14532D]">FSSAI Registered Food Business</p>
        <p className="text-xs text-emerald-900/75">Registration No. {registrationNumber}</p>
      </div>
    </Link>
  );
}
