import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import '@mdh/ui/globals.css';
import { DeliveryShell } from '@mdh/ui';
import { Providers } from '@/components/providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = { title: 'Delivery | Mercy Dosa House' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <Providers>
          <DeliveryShell>{children}</DeliveryShell>
        </Providers>
      </body>
    </html>
  );
}
