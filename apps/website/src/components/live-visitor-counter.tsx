'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'mdh_visitor_id';
const HEARTBEAT_MS = 12_000;

type VisitorStats = {
  visitorId?: string;
  online: number;
  total: number;
};

function formatCount(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('en-IN');
}

function AnimatedDigits({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) {
      setDisplay(value);
      return;
    }
    const from = prev.current;
    prev.current = value;
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const digits = formatCount(display).split('');

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div
        className="flex items-center gap-0.5 sm:gap-1 font-mono tracking-wider"
        aria-label={`${label}: ${formatCount(display)}`}
      >
        {digits.map((ch, i) =>
          ch === ',' || ch === '.' ? (
            <span key={`s-${i}`} className="text-amber-300/70 text-sm sm:text-base px-0.5">
              {ch}
            </span>
          ) : (
            <span
              key={`${i}-${ch}`}
              className="relative inline-flex h-7 w-5 sm:h-8 sm:w-6 items-center justify-center rounded-md bg-gradient-to-b from-white/15 to-white/5 border border-white/15 text-sm sm:text-base font-semibold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(245,158,11,0.15)]"
            >
              <span className="relative z-10 tabular-nums">{ch}</span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
              />
            </span>
          ),
        )}
      </div>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/45">
        {label}
      </span>
    </div>
  );
}

export function LiveVisitorCounter() {
  const [stats, setStats] = useState<VisitorStats>({ online: 0, total: 0 });
  const [ready, setReady] = useState(false);
  const visitorIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    try {
      visitorIdRef.current = localStorage.getItem(STORAGE_KEY);
    } catch {
      visitorIdRef.current = null;
    }

    const beat = async () => {
      try {
        const res = await api.post<VisitorStats>('/visitors/heartbeat', {
          visitorId: visitorIdRef.current ?? undefined,
        });
        if (cancelled) return;
        if (res.visitorId && res.visitorId !== visitorIdRef.current) {
          visitorIdRef.current = res.visitorId;
          try {
            localStorage.setItem(STORAGE_KEY, res.visitorId);
          } catch {
            /* private mode */
          }
        }
        setStats({ online: res.online ?? 0, total: res.total ?? 0 });
        setReady(true);
      } catch {
        if (!cancelled) {
          try {
            const fallback = await api.get<VisitorStats>('/visitors/stats');
            if (!cancelled) {
              setStats({ online: fallback.online ?? 0, total: fallback.total ?? 0 });
              setReady(true);
            }
          } catch {
            /* keep last known */
          }
        }
      }
    };

    void beat();
    timer = setInterval(() => void beat(), HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c3d24]/80 via-[#14532D]/60 to-[#0a2918]/90 px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_0_40px_rgba(20,83,45,0.35)]"
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-emerald-300/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/90 font-medium">
              Live pulse
            </p>
            <p className="text-sm text-white/85 truncate">
              {ready ? 'Real-time website visitors' : 'Connecting to live feed…'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-5 sm:gap-8">
          <AnimatedDigits value={stats.online} label="Online now" />
          <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent" />
          <AnimatedDigits value={stats.total} label="Total visits" />
        </div>
      </div>
    </div>
  );
}
