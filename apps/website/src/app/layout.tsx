import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import '@mdh/ui/globals.css';
import { Providers } from '@/components/providers';
import { SiteShell } from '@/components/site-shell';
import { BRAND } from '@mdh/utils';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: 'Order fresh dosas, idly, vada, meals and biryani online. Delivered with love.',
  keywords: ['dosa', 'idly', 'biryani', 'food delivery', 'chennai', 'south indian'],
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    type: 'website',
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: BRAND.name, description: BRAND.tagline },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <Providers>
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
