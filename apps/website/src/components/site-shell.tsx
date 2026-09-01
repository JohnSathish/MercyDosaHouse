'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { MobileTopBar } from './mobile/mobile-top-bar';
import { MobileDrawer } from './mobile/mobile-drawer';
import { MobileBottomNav } from './mobile/mobile-bottom-nav';
import { CartSheet } from './mobile/cart-sheet';
import { FloatingActions } from './mobile/floating-actions';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { PwaRegister } from './mobile/pwa-register';
import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { DeliveryPopup } from '@/components/marketing/delivery-popup';
import { PromotionalPopup } from '@/components/marketing/promotional-popup';
import { AppPromoPopup } from '@/components/marketing/app-promo-popup';
import { AppPromoBanner } from '@/components/marketing/app-promo-banner';
import { RestaurantClosedBanner } from '@/components/restaurant/restaurant-closed-banner';

interface SiteShellProps {
  children: React.ReactNode;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  hours?: string;
  socialLinks?: Record<string, string> | null;
  fssaiRegistrationNumber?: string | null;
  fssaiCertificateUrl?: string | null;
}

function BottomNavFallback() {
  return <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t" />;
}

export function SiteShell({
  children,
  phone,
  whatsapp,
  email,
  address,
  hours,
  socialLinks,
  fssaiRegistrationNumber,
  fssaiCertificateUrl,
}: SiteShellProps) {
  const pathname = usePathname();
  const showInlineAppPromo = pathname !== '/';
  const mainOffset = 'pt-[6.75rem] lg:pt-[7.25rem]';
  const footerProps = {
    phone,
    whatsapp,
    email,
    address,
    hours,
    socialLinks,
    fssaiRegistrationNumber,
    fssaiCertificateUrl,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E8]">
      <PwaRegister />
      <DeliveryPopup />
      <PromotionalPopup />
      <AppPromoPopup />

      {/* Fixed top stack: announcement + nav — always visible, never overlapped */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <RestaurantClosedBanner />
        <AnnouncementBar />
        <div className="hidden lg:block">
          <SiteHeader embedded />
        </div>
        <MobileTopBar embedded />
      </div>

      <MobileDrawer />
      <CartSheet />

      <main className={`flex-1 ${mainOffset} pb-16 lg:pb-0 mobile-main`}>
        {showInlineAppPromo ? (
          <div className="container mx-auto px-4 pt-2">
            <AppPromoBanner placement="site" />
          </div>
        ) : null}
        {children}
      </main>

      <div className="hidden lg:block">
        <SiteFooter {...footerProps} />
      </div>
      <div className="lg:hidden pb-16">
        <SiteFooter {...footerProps} compact />
      </div>

      <Suspense fallback={<BottomNavFallback />}>
        <MobileBottomNav />
      </Suspense>
      <FloatingActions phone={phone} whatsapp={whatsapp} />
    </div>
  );
}
