'use client';

import { CustomerShell } from '@mdh/ui';
import { useCartStore } from '@/lib/cart-store';

export function SiteShell({ children }: { children: React.ReactNode }) {
  const totalItems = useCartStore((s) => s.totalItems());
  return <CustomerShell cartCount={totalItems}>{children}</CustomerShell>;
}
