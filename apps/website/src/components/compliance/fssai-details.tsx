import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { BusinessSettingsDto } from '@mdh/types';

interface FssaiDetailsProps {
  settings: BusinessSettingsDto | null;
  compact?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function FssaiDetails({ settings, compact = false }: FssaiDetailsProps) {
  if (!settings || settings.fssaiEnabled === false) return null;

  const registrationNumber = settings.fssaiRegistrationNumber;
  if (!registrationNumber) return null;

  const issuedOn = formatDate(settings.fssaiIssuedOn);
  const feePaidUntil = formatDate(settings.fssaiFeePaidUntil);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#14532D]" />
        <div className="min-w-0">
          <p className="font-semibold">FSSAI Registered Food Business</p>
          <p className="text-xs text-emerald-900/75">Registration No. {registrationNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-[0_8px_28px_rgba(20,83,45,0.08)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#14532D] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C17A08]">
              Food safety & trust
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#14532D]">FSSAI Registered</h2>
            <p className="mt-1 text-sm text-gray-600">
              Our food business is registered under the Food Safety and Standards Act, 2006.
            </p>
          </div>
        </div>
        {settings.fssaiCertificateUrl ? (
          <a
            href={settings.fssaiCertificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#14532D]/20 px-3 py-2 text-sm font-semibold text-[#14532D] transition hover:bg-[#14532D] hover:text-white"
          >
            View certificate <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Registration number</dt>
          <dd className="mt-0.5 font-bold tracking-wide text-[#14532D]">{registrationNumber}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Kind of business</dt>
          <dd className="mt-0.5 font-medium text-gray-800">{settings.fssaiKindOfBusiness}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Certificate holder</dt>
          <dd className="mt-0.5 font-medium text-gray-800">{settings.fssaiBusinessName}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Nearest landmark</dt>
          <dd className="mt-0.5 font-medium text-gray-800">{settings.fssaiNearestLandmark}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Issued on</dt>
          <dd className="mt-0.5 font-medium text-gray-800">{issuedOn ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Fee paid until</dt>
          <dd className="mt-0.5 font-medium text-gray-800">{feePaidUntil ?? '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gray-500">Registered premises</dt>
          <dd className="mt-0.5 font-medium leading-6 text-gray-800">
            {settings.fssaiPremisesAddress}
          </dd>
        </div>
      </dl>
    </section>
  );
}
