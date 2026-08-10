'use client';

import { DeliveryNav } from './delivery-nav';

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <DeliveryNav />
      {children}
    </div>
  );
}
