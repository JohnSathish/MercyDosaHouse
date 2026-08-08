'use client';

import Link from 'next/link';
import { CartContent } from '@/components/cart/cart-content';

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-4 lg:py-8 max-w-2xl pb-24 lg:pb-8">
      <h1 className="text-2xl lg:text-3xl font-bold text-primary mb-6">Your Cart</h1>
      <CartContent />
    </div>
  );
}
