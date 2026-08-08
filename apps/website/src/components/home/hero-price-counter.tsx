'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function HeroPriceCounter({ price }: { price: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(price);
  const prev = useRef(price);

  useEffect(() => {
    if (reduced || prev.current === price) {
      setDisplay(price);
      prev.current = price;
      return;
    }

    const from = prev.current;
    prev.current = price;
    const start = performance.now();
    const duration = 500;

    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (price - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [price, reduced]);

  return <>₹{display}</>;
}
