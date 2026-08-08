import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import '@mdh/ui/globals.css';
import { Providers } from '@/components/providers';
import { SiteShell } from '@/components/site-shell';
import { CmsContentProvider } from '@/components/cms/cms-content-provider';
import { BRAND } from '@mdh/utils';
import { api } from '@/lib/api';
import { getPublishedSiteContent } from '@/lib/cms-content';
import type { BusinessSettingsDto } from '@mdh/types';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#14532D',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    'Order fresh dosas, idly, vada and chicken biryani online in Tura, Meghalaya. Delivered with love.',
  keywords: ['dosa', 'idly', 'biryani', 'food delivery', 'tura', 'meghalaya', 'south indian'],
  twitter: { card: 'summary_large_image', title: BRAND.name, description: BRAND.tagline },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/images/logo.png', width: 512, height: 512, alt: BRAND.name }],
  },
};

async function getSettings() {
  try {
    return await Promise.race([
      api.get<BusinessSettingsDto>('/settings/business'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, cmsContent] = await Promise.all([getSettings(), getPublishedSiteContent()]);

  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <CmsContentProvider content={cmsContent}>
            <SiteShell
              phone={settings?.phone}
              whatsapp={settings?.whatsapp}
              address={settings?.address}
              hours={settings?.openingHours}
            >
              {children}
            </SiteShell>
          </CmsContentProvider>
        </Providers>
      </body>
    </html>
  );
}
