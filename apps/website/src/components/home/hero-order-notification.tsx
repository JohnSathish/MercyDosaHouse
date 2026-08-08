'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HERO_MENU_ITEMS } from '@/lib/hero-menu-items';

const NAMES = ['John', 'Priya', 'Rahul', 'Ananya', 'David', 'Meera', 'Arjun', 'Sneha'];
const TIMES = ['1 min ago', '2 mins ago', '3 mins ago', '5 mins ago'];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function HeroOrderNotification() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [order, setOrder] = useState({
    name: 'John',
    item: HERO_MENU_ITEMS[1],
    time: '2 mins ago',
  });

  useEffect(() => {
    if (reduced) return;

    const show = () => {
      setOrder({
        name: randomPick(NAMES),
        item: randomPick(HERO_MENU_ITEMS),
        time: randomPick(TIMES),
      });
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };

    const initial = setTimeout(show, 5000);
    const interval = setInterval(show, 9000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="fixed bottom-6 left-4 z-50 pointer-events-none md:left-auto md:right-6">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.18)] px-4 py-3 max-w-[280px]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14532D]/10 text-lg">
              {order.item.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 leading-tight">
                <span className="font-semibold text-[#14532D]">{order.name}</span> ordered
              </p>
              <p className="text-sm font-bold text-[#1F2937] truncate">{order.item.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{order.time}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
