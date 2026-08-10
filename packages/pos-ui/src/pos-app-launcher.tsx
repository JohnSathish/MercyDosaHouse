'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@mdh/ui';
import { X } from 'lucide-react';
import { POS_THEME } from './pos-theme';
import {
  POS_ADMIN_LINKS,
  openAdminLink,
  type PosAdminLink,
  type PosAdminLinkAction,
} from './pos-admin-links';

interface PosAppLauncherProps {
  open: boolean;
  darkMode: boolean;
  adminBaseUrl: string;
  openBillsCount: number;
  onClose: () => void;
  onAction: (action: PosAdminLinkAction) => void;
}

export function PosAppLauncher({
  open,
  darkMode,
  adminBaseUrl,
  openBillsCount,
  onClose,
  onAction,
}: PosAppLauncherProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleClick(link: PosAdminLink) {
    if (link.action) {
      onAction(link.action);
      onClose();
      return;
    }
    if (link.href) {
      openAdminLink(adminBaseUrl, link);
      onClose();
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[280] bg-black/30 backdrop-blur-[1px]"
        aria-label="Close app launcher"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'fixed z-[281] top-14 right-4 w-[min(420px,calc(100vw-2rem))] rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200',
          darkMode
            ? 'bg-gray-900 border-gray-700 text-white'
            : 'bg-white border-gray-200 text-gray-900',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div>
            <p className="font-bold text-sm">Applications</p>
            <p className="text-[11px] text-gray-400">
              Opens in a new tab · POS session stays active
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-lg transition',
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {openBillsCount > 0 && (
          <div
            className={cn(
              'mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium',
              darkMode ? 'bg-amber-950/40 text-amber-200' : 'bg-amber-50 text-amber-800',
            )}
          >
            {openBillsCount} open bill{openBillsCount === 1 ? '' : 's'} — billing continues in this
            tab
          </div>
        )}

        <div className="p-4 grid grid-cols-3 gap-2 max-h-[min(60vh,480px)] overflow-y-auto">
          {POS_ADMIN_LINKS.map((link) => {
            const Icon = link.icon;
            const isDestructive = link.action === 'exit-pos';
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleClick(link)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border transition hover:scale-[1.02] active:scale-[0.98] text-center',
                  darkMode
                    ? 'border-gray-800 hover:bg-gray-800/80'
                    : 'border-gray-100 hover:bg-gray-50',
                  isDestructive &&
                    (darkMode
                      ? 'hover:bg-red-950/30 hover:border-red-900/50'
                      : 'hover:bg-red-50 hover:border-red-100'),
                )}
              >
                <span
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isDestructive
                      ? darkMode
                        ? 'bg-red-950/50 text-red-300'
                        : 'bg-red-50 text-red-600'
                      : darkMode
                        ? 'bg-gray-800 text-emerald-400'
                        : 'bg-emerald-50 text-emerald-700',
                  )}
                  style={isDestructive ? undefined : { color: POS_THEME.primary }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-semibold leading-tight">{link.label}</span>
                {link.shortcut && (
                  <span className="text-[9px] text-gray-400 font-mono">{link.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            'px-4 py-2.5 border-t text-[10px] text-gray-400 text-center',
            darkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-100 bg-gray-50/80',
          )}
        >
          Tip: Use Ctrl+Alt+H/O/M/K/R for quick access · Ctrl+K still searches menu
        </div>
      </div>
    </>
  );
}
