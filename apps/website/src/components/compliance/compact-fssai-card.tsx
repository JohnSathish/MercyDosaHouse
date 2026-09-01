import Link from 'next/link';
import Image from 'next/image';
import type { BusinessSettingsDto } from '@mdh/types';

const FSSAI_FALLBACK = '21726006000529';
const FSSAI_LOGO_SRC = 'https://westregion.fssai.gov.in/images/FSSAI_logo.png';

export function CompactFssaiCard({ settings }: { settings: BusinessSettingsDto | null }) {
  if (settings?.fssaiEnabled === false) return null;
  const registrationNumber = settings?.fssaiRegistrationNumber?.trim() || FSSAI_FALLBACK;
  const kind = settings?.fssaiKindOfBusiness?.trim() || 'Food Vending Establishment';

  return (
    <Link
      href="/fssai"
      className="mx-auto flex max-w-2xl items-center gap-4 rounded-2xl border border-[#0B542F]/10 bg-white px-4 py-3 text-[#18352A] shadow-sm transition hover:border-[#0B542F]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A000]"
    >
      <Image
        src={FSSAI_LOGO_SRC}
        alt="FSSAI"
        width={56}
        height={56}
        className="h-12 w-12 object-contain"
        unoptimized
      />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0B542F]">
          FSSAI Registered Food Business
        </p>
        <p className="mt-0.5 text-sm">Registration No. {registrationNumber}</p>
        <p className="text-xs text-[#18352A]/65">{kind}</p>
      </div>
    </Link>
  );
}
