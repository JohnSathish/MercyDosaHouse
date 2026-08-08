'use client';

import { useEffect, useState } from 'react';
import { cn } from '@mdh/ui';
import { playKitchenSound } from '@/lib/kitchen-sounds';

interface KitchenTimerProps {
  startedAt?: string | null;
  createdAt: string;
  muted?: boolean;
  className?: string;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function KitchenTimer({ startedAt, createdAt, muted, className }: KitchenTimerProps) {
  const [elapsed, setElapsed] = useState('');
  const [color, setColor] = useState('text-emerald-500');
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
    let playedOverdue = false;

    const tick = () => {
      const ms = Date.now() - start;
      const mins = ms / 60000;
      setElapsed(formatElapsed(ms));

      if (mins <= 10) setColor('text-emerald-500');
      else if (mins <= 20) setColor('text-amber-500');
      else {
        setColor('text-red-500');
        setOverdue(true);
        if (!playedOverdue && !muted) {
          playedOverdue = true;
          playKitchenSound('overdue');
        }
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, createdAt, muted]);

  return (
    <span
      className={cn(
        'font-mono text-2xl font-bold tabular-nums',
        color,
        overdue && 'animate-pulse',
        className,
      )}
    >
      {elapsed}
    </span>
  );
}
