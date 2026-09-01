'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@mdh/ui';

export default function TrackOrderIndexPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-bold text-[#14532D]">Order Tracking</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter the order number from your confirmation SMS or receipt.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const value = orderNumber.trim();
          if (!value) return;
          router.push(`/track/${encodeURIComponent(value)}`);
        }}
      >
        <label className="block text-sm font-medium text-[#14532D]" htmlFor="order-number">
          Order number
        </label>
        <input
          id="order-number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full rounded-xl border border-[#14532D]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F59E0B]/50"
          placeholder="MDH-12345"
          autoComplete="off"
        />
        <Button type="submit" className="w-full bg-primary min-h-11">
          Track order
        </Button>
      </form>
    </div>
  );
}
