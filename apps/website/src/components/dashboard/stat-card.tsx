'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent } from '@mdh/ui';

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  index?: number;
}

function Counter({
  value,
  suffix = '',
  prefix = '',
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export function StatCard({
  icon,
  label,
  value,
  suffix = '',
  prefix = '',
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="rounded-2xl border-0 shadow-md card-lift bg-white hover:shadow-xl transition-all duration-300">
        <CardContent className="p-5">
          <span className="text-2xl mb-3 block">{icon}</span>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#14532D]">
            <Counter value={value} suffix={suffix} prefix={prefix} />
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
