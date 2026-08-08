import { BRAND } from '@mdh/utils';
import { api } from '@/lib/api';
import type { BusinessSettingsDto } from '@mdh/types';

export default async function ContactPage() {
  let settings: BusinessSettingsDto | null = null;
  try {
    settings = await Promise.race([
      api.get<BusinessSettingsDto>('/settings/business'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
  } catch {
    /* ignore */
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold text-primary mb-8">Contact Us</h1>
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold mb-1">Phone</h2>
          <p>{settings?.phone || '9566363655'}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1">WhatsApp</h2>
          <a
            href={`https://wa.me/${settings?.whatsapp || '919876543210'}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat on WhatsApp
          </a>
        </div>
        <div>
          <h2 className="font-semibold mb-1">Email</h2>
          <p>{settings?.email || 'info@mercydosahouse.com'}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1">Address</h2>
          <p>{settings?.address || 'Tura, Meghalaya'}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-1">Opening Hours</h2>
          <p>{settings?.openingHours || '7:00 AM - 10:00 PM'}</p>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: 'Contact' };
