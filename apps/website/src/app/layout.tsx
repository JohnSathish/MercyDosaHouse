import type { Metadata, Viewport } from 'next';
import { Poppins, Inter } from 'next/font/google';
import '@mdh/ui/globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from '@/components/providers';
import { SiteShell } from '@/components/site-shell';
import { CmsContentProvider } from '@/components/cms/cms-content-provider';
import { MarketingProvider } from '@/components/marketing/marketing-provider';
import { BRAND } from '@mdh/utils';
import { APP_URLS } from '@/lib/app-urls';
import { api } from '@/lib/api';
import { getPublishedSiteContent } from '@/lib/cms-content';
import { getMarketingBundle } from '@/lib/marketing-content';
import { RestaurantJsonLd } from '@/components/seo/restaurant-jsonld';
import type { BusinessSettingsDto, ReviewSummaryDto } from '@mdh/types';
import { resolvePublicMediaUrl } from '@mdh/utils';
import { absoluteAsset, getPublicSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getPublicSeo();
  const image = absoluteAsset(config.defaultOgImage, config);
  return {
    metadataBase: new URL(config.canonicalDomain || APP_URLS.website),
    title: {
      default: config.defaultTitle,
      template: `%s | ${BRAND.name}`,
    },
    description: config.defaultDescription,
    keywords: config.defaultKeywords
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean),
    twitter: {
      card: 'summary_large_image',
      title: config.defaultTitle,
      description: config.defaultDescription,
      images: [image],
    },
    robots: { index: true, follow: true },
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.png',
      apple: '/icon-192.png',
    },
    openGraph: {
      title: config.defaultTitle,
      description: config.defaultDescription,
      type: 'website',
      locale: 'en_IN',
      siteName: BRAND.name,
      images: [{ url: image, alt: BRAND.name }],
    },
    verification: config.googleVerification ? { google: config.googleVerification } : undefined,
  };
}

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
  const [settings, cmsContent, marketing, seo, rating] = await Promise.all([
    getSettings(),
    getPublishedSiteContent(),
    getMarketingBundle(),
    getPublicSeo(),
    api.get<ReviewSummaryDto>('/reviews/summary').catch(() => null),
  ]);

  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <RestaurantJsonLd
          settings={settings}
          seo={seo.config}
          rating={rating}
          logoUrl={cmsContent.theme?.logoUrl}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <CmsContentProvider content={cmsContent}>
            <MarketingProvider bundle={marketing}>
              <SiteShell
                phone={settings?.phone}
                whatsapp={settings?.whatsapp}
                email={settings?.email}
                address={settings?.address}
                hours={settings?.openingHours}
                socialLinks={settings?.socialLinks}
                fssaiRegistrationNumber={
                  settings?.fssaiEnabled === false ? null : settings?.fssaiRegistrationNumber
                }
                fssaiCertificateUrl={
                  settings?.fssaiEnabled === false
                    ? null
                    : resolvePublicMediaUrl(settings?.fssaiCertificateUrl, APP_URLS.website) || null
                }
              >
                {children}
              </SiteShell>
            </MarketingProvider>
          </CmsContentProvider>
        </Providers>
      </body>
    </html>
  );
}
