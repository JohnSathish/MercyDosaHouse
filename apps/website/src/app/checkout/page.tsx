'use client';

import { Suspense } from 'react';
import { CheckoutPageClient } from '@/components/checkout/checkout-page-client';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading checkout...
        </div>
      }
    >
      <CheckoutPageClient />
    </Suspense>
  );
}
