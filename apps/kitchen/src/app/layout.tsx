import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import '@mdh/ui/globals.css';
import { KitchenShell } from '@mdh/ui';
import { Providers } from '@/components/providers';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = { title: 'Kitchen | Mercy Dosa House' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <Providers>
          <KitchenShell>{children}</KitchenShell>
        </Providers>
      </body>
    </html>
  );
}
