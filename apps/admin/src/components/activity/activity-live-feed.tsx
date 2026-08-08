'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Radio } from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import type { ActivityLogDto } from '@mdh/types';
import { severityEmoji } from './activity-severity-badge';
import { ActivityModuleBadge } from './activity-module-badge';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ActivityLiveFeed({
  items,
  connected,
  onSelect,
}: {
  items: ActivityLogDto[];
  connected: boolean;
  onSelect?: (log: ActivityLogDto) => void;
}) {
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [items.length, paused]);

  return (
    <div className="rounded-2xl border bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Radio
            className={cn(
              'h-4 w-4',
              connected ? 'text-emerald-500 animate-pulse' : 'text-gray-400',
            )}
          />
          <h3 className="font-semibold text-sm">Live Activity Feed</h3>
          {connected && (
            <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPaused((p) => !p)}
          className="h-7 text-xs gap-1"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      <div ref={listRef} className="max-h-[420px] overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Waiting for activity events…
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {(paused ? items.slice(0, 15) : items).map((log) => (
              <motion.button
                key={log.id}
                type="button"
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect?.(log)}
                className="w-full text-left rounded-xl border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                    {formatTime(log.createdAt)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {severityEmoji(log.severity)}{' '}
                      <span className="font-semibold">{log.userName ?? 'System'}</span>{' '}
                      {log.action.toLowerCase().replace('_', ' ')}{' '}
                      <ActivityModuleBadge module={log.module} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {log.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
