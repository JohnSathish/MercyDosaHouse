import { api } from '@/lib/api';
import { getMarketingBundle } from '@/lib/marketing-content';
import type { BusinessSettingsDto } from '@mdh/types';
import { ContactInfoPanel } from '@/components/contact/contact-info-panel';
import { ContactForm } from '@/components/contact/contact-form';
import { buildPageMetadata, getPublicSeo } from '@/lib/seo';

export const generateMetadata = () => buildPageMetadata('contact', '/contact');

async function fetchBusinessSettings(): Promise<BusinessSettingsDto | null> {
  try {
    return await Promise.race([
      api.get<BusinessSettingsDto>('/settings/business'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const [settings, marketing, seo] = await Promise.all([
    fetchBusinessSettings(),
    getMarketingBundle(),
    getPublicSeo(),
  ]);

  return (
    <div className="bg-[#FDF8F4] min-h-[calc(100vh-12rem)]">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start max-w-6xl mx-auto">
          <ContactInfoPanel
            settings={settings}
            delivery={marketing.delivery}
            mapsUrl={seo.config.googleMapsUrl}
          />
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
