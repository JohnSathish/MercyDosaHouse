'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PosMenuProductDto } from '@mdh/types';

interface PosFlyToCartProps {
  product: PosMenuProductDto | null;
  fromRect: DOMRect | null;
}

export function PosFlyToCart({ product, fromRect }: PosFlyToCartProps) {
  if (!product || !fromRect) return null;

  const billPanel = document.getElementById('pos-bill-panel');
  const toRect = billPanel?.getBoundingClientRect();
  if (!toRect) return null;

  const startX = fromRect.left + fromRect.width / 2;
  const startY = fromRect.top + fromRect.height / 2;
  const endX = toRect.left + toRect.width / 2;
  const endY = toRect.top + 80;

  return (
    <AnimatePresence>
      <motion.div
        key={product.id + Date.now()}
        initial={{
          position: 'fixed',
          left: startX,
          top: startY,
          x: '-50%',
          y: '-50%',
          scale: 1,
          opacity: 1,
          zIndex: 9999,
        }}
        animate={{
          left: endX,
          top: endY,
          scale: 0.3,
          opacity: 0,
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none w-16 h-16 rounded-full overflow-hidden shadow-2xl border-2 border-white"
      >
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl bg-emerald-100">
            🍽
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
