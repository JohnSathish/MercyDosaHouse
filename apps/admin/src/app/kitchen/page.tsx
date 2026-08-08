'use client';

import { KdsPageClient } from '@/components/kitchen/kds-page';

export default function KitchenPage() {
  return (
    <div className="kds-dark -m-4 lg:-m-6 xl:-m-8 min-h-[calc(100vh-3.5rem)] bg-gray-950 p-4 lg:p-6 xl:p-8">
      <KdsPageClient />
    </div>
  );
}
