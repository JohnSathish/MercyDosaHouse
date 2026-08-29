import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  IdCard,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { BusinessSettingsDto } from '@mdh/types';

interface FssaiDetailsProps {
  settings: BusinessSettingsDto | null;
  compact?: boolean;
}

// Official FSSAI asset hosted by an FSSAI government domain.
const FSSAI_LOGO_SRC = 'https://westregion.fssai.gov.in/images/FSSAI_logo.png';

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#14532D]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 break-words font-semibold leading-5 text-[#14532D]">{value || '—'}</dd>
      </div>
    </div>
  );
}

export function FssaiDetails({ settings, compact = false }: FssaiDetailsProps) {
  if (!settings || settings.fssaiEnabled === false) return null;

  const registrationNumber = settings.fssaiRegistrationNumber;
  if (!registrationNumber) return null;

  const issuedOn = formatDate(settings.fssaiIssuedOn);
  const feePaidUntil = formatDate(settings.fssaiFeePaidUntil);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950 shadow-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#14532D]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold text-[#14532D]">FSSAI Registered Food Business</p>
          <p className="text-xs text-emerald-900/75">Registration No. {registrationNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-[0_10px_32px_rgba(20,83,45,0.09)] sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b border-emerald-100 pb-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#14532D] text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C17A08]">
              Food safety &amp; trust
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#14532D] sm:text-2xl">FSSAI Registered</h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-gray-600">
              Our food business is registered under the Food Safety and Standards Act, 2006.
            </p>
          </div>
        </div>
        <img
          src={FSSAI_LOGO_SRC}
          alt="FSSAI - Food Safety and Standards Authority of India"
          className="h-auto w-[100px] shrink-0 object-contain sm:w-[145px]"
        />
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2">
        <Detail icon={IdCard} label="Registration number" value={registrationNumber} />
        <Detail icon={Building2} label="Kind of business" value={settings.fssaiKindOfBusiness} />
        <Detail icon={UserRound} label="Certificate holder" value={settings.fssaiBusinessName} />
        <Detail icon={MapPin} label="Nearest landmark" value={settings.fssaiNearestLandmark} />
        <Detail icon={CalendarDays} label="Issued on" value={issuedOn} />
        <Detail icon={BadgeCheck} label="Fee paid until" value={feePaidUntil} />
        <div className="flex items-start gap-3 sm:col-span-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#14532D]">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-500">Registered premises</dt>
            <dd className="mt-1 font-semibold leading-5 text-[#14532D]">
              {settings.fssaiPremisesAddress || '—'}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#14532D]" aria-hidden="true" />
          <div>
            <p className="font-bold text-[#14532D]">FSSAI Registration Certificate</p>
            {settings.fssaiCertificateUrl ? (
              <p className="mt-1 text-sm text-gray-600">
                View our official FSSAI registration certificate.
              </p>
            ) : (
              <>
                <p className="mt-1 font-semibold text-gray-700">Certificate Coming Soon</p>
                <p className="mt-1 text-sm text-gray-600">
                  The official certificate will be available here once uploaded by the
                  administrator.
                </p>
              </>
            )}
          </div>
        </div>
        {settings.fssaiCertificateUrl ? (
          <a
            href={settings.fssaiCertificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#166534]"
          >
            View Certificate <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>

      <p className="mt-5 text-center text-sm text-gray-600">
        <span className="font-semibold text-[#14532D]">Your trust matters to us.</span> Mercy Dosa
        House operates as a registered food business and follows applicable food safety
        requirements.
      </p>
    </section>
  );
}
