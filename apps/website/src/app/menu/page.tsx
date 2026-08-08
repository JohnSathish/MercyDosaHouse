import { Suspense } from 'react';
import { MenuPageClient } from '@/components/menu/menu-page-client';
import { MenuPageSkeleton } from '@/components/skeletons/menu-page-skeleton';

export const metadata = { title: 'Menu' };

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuPageSkeleton />}>
      <MenuPageClient />
    </Suspense>
  );
}
