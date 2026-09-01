import { api } from '@/lib/api';
import { APP_URLS } from '@/lib/app-urls';
import type { BusinessSettingsDto } from '@mdh/types';
import { resolvePublicMediaUrl } from '@mdh/utils';
import { FssaiDetails } from '@/components/compliance/fssai-details';

async function getBusinessSettings(): Promise<BusinessSettingsDto | null> {
  try {
    return await Promise.race([
      api.get<BusinessSettingsDto>('/settings/business'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FssaiPage() {
  const settings = await getBusinessSettings();
  const publicSettings = settings?.fssaiEnabled === false ? null : settings;
  const certificateUrl =
    resolvePublicMediaUrl(publicSettings?.fssaiCertificateUrl, APP_URLS.website) || null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <FssaiDetails settings={publicSettings} />

      {publicSettings?.fssaiRegistrationNumber && certificateUrl ? (
        <section className="mt-8 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-[0_8px_28px_rgba(20,83,45,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-[#14532D]">FSSAI Registration Certificate</h2>
              <p className="mt-1 text-sm text-gray-500">
                Official certificate document provided by the food business.
              </p>
            </div>
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-[#14532D] transition hover:bg-emerald-50"
            >
              Open in new tab
            </a>
          </div>
          <iframe
            title="FSSAI registration certificate"
            src={certificateUrl}
            className="h-[70vh] min-h-[520px] w-full"
          />
        </section>
      ) : publicSettings?.fssaiRegistrationNumber ? (
        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/50 p-5 text-sm text-gray-700">
          <p className="font-bold text-[#14532D]">Certificate Coming Soon</p>
          <p className="mt-1">
            The official certificate will be available here once uploaded by the administrator.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export const metadata = {
  title: 'FSSAI Registration',
  description: 'Mercy Dosa House food safety registration details.',
};
