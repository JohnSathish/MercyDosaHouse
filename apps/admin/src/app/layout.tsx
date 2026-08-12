import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import '@mdh/ui/globals.css';
import { Providers } from '@/components/providers';
import { AdminLayoutShell } from '@/components/admin-layout-shell';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: { default: 'Admin | Mercy Dosa House', template: '%s | MDH Admin' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <Providers>
          <AdminLayoutShell>{children}</AdminLayoutShell>
        </Providers>
      </body>
    </html>
  );
}
