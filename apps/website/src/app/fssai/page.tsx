import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';
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

export default async function FssaiPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <FssaiDetails settings={settings} />

      {settings?.fssaiCertificateUrl ? (
        <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-[#14532D]">Registration certificate</h2>
            <p className="mt-1 text-sm text-gray-500">
              Official certificate document provided by the food business.
            </p>
          </div>
          <iframe
            title="FSSAI registration certificate"
            src={settings.fssaiCertificateUrl}
            className="h-[70vh] min-h-[520px] w-full"
          />
        </section>
      ) : (
        <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          The registration details are published above. The certificate document will be available
          here once it is uploaded by the administrator.
        </p>
      )}
    </div>
  );
}

export const metadata = {
  title: 'FSSAI Registration',
  description: 'Mercy Dosa House food safety registration details.',
};
