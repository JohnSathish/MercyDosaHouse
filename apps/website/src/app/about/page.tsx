import { api } from '@/lib/api';
import { BRAND } from '@mdh/utils';
import type { BusinessSettingsDto } from '@mdh/types';
import { FssaiDetails } from '@/components/compliance/fssai-details';
import { buildPageMetadata } from '@/lib/seo';

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

export default async function AboutPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-primary mb-8">About {BRAND.name}</h1>
      <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Our Story</h2>
          <p>
            {BRAND.name} is a South Indian kitchen in Tura, Meghalaya. We cook dosa, idli, vada and
            Chicken Dum Biryani to order for takeaway and home delivery where we currently serve.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">Our Mission</h2>
          <p>
            To serve freshly made, hygienic, and delicious food with the warmth of home cooking.
            Every dish is prepared with love, using quality ingredients and time-honored recipes.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground">Why Choose Us</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fresh ingredients sourced daily</li>
            <li>Traditional recipes with modern hygiene standards</li>
            <li>Fast delivery with care</li>
            <li>Affordable prices for families</li>
          </ul>
        </section>
      </div>
      <div className="mt-10">
        <FssaiDetails settings={settings} />
      </div>
    </div>
  );
}

export const generateMetadata = () => buildPageMetadata('about', '/about');
