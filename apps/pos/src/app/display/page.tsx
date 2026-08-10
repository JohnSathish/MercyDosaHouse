'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@mdh/utils';
import type { PosBillDto } from '@mdh/types';
import { getPosSocket } from '@mdh/pos-ui';

/** Customer-facing display — open on second screen at /display */
export default function CustomerDisplayPage() {
  const [bill, setBill] = useState<PosBillDto | null>(null);
  const [thankYou, setThankYou] = useState(false);

  useEffect(() => {
    const socket = getPosSocket();
    socket.on('billUpdate', (data: PosBillDto & { settled?: boolean }) => {
      if (data.settled) {
        setThankYou(true);
        setTimeout(() => setThankYou(false), 5000);
      }
      setBill(data);
    });
    return () => {
      socket.off('billUpdate');
    };
  }, []);

  if (thankYou) {
    return (
      <div className="min-h-screen bg-[#14532D] flex items-center justify-center text-white text-center p-8">
        <div>
          <p className="text-6xl mb-4">❤️</p>
          <h1 className="text-4xl font-bold">Thank You!</h1>
          <p className="text-xl mt-2 opacity-80">Visit Again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-emerald-400 mb-6">Mercy Dosa House</h1>
        {bill ? (
          <>
            <div className="space-y-3 mb-6">
              {bill.items.map((item) => (
                <div key={item.id} className="flex justify-between text-lg">
                  <span>
                    {item.quantity}× {item.productName}
                  </span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/20 pt-4 text-2xl font-bold flex justify-between">
              <span>Total</span>
              <span className="text-emerald-400">{formatCurrency(bill.grandTotal)}</span>
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-xl">Welcome! Your order will appear here.</p>
        )}
      </div>
    </div>
  );
}
