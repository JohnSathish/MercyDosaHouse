'use client';

import { InventoryNav } from './inventory-nav';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <InventoryNav />
      {children}
    </div>
  );
}
