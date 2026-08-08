'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import type { ActivityLogDto } from '@mdh/types';
import { ActivitySeverityBadge } from './activity-severity-badge';
import { ActivityModuleBadge } from './activity-module-badge';

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: unknown; newVal: unknown }) {
  const oldStr =
    oldVal != null ? String(typeof oldVal === 'object' ? JSON.stringify(oldVal) : oldVal) : '—';
  const newStr =
    newVal != null ? String(typeof newVal === 'object' ? JSON.stringify(newVal) : newVal) : '—';
  if (oldStr === newStr && oldStr === '—') return null;

  return (
    <div className="rounded-xl border overflow-hidden">
      <p className="text-xs font-bold uppercase text-muted-foreground px-3 py-2 bg-muted/40">
        {label}
      </p>
      <div className="grid grid-cols-[1fr,auto,1fr] gap-2 p-3 text-sm">
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2">
          <p className="text-[10px] font-bold text-red-600 mb-1">Old</p>
          <p className="font-mono text-xs break-all">{oldStr}</p>
        </div>
        <div className="flex items-center text-muted-foreground">↓</div>
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2">
          <p className="text-[10px] font-bold text-emerald-600 mb-1">New</p>
          <p className="font-mono text-xs break-all">{newStr}</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null | number }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all">{value}</span>
    </div>
  );
}

export function ActivityDetailDrawer({
  log,
  open,
  onOpenChange,
}: {
  log: ActivityLogDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  const oldObj = log.oldValue as Record<string, unknown> | null;
  const newObj = log.newValue as Record<string, unknown> | null;
  const diffKeys = new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            Activity Details
            <ActivitySeverityBadge severity={log.severity} />
          </SheetTitle>
          <p className="text-xs text-muted-foreground font-mono mt-1">{log.id}</p>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="rounded-xl border p-3 space-y-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <ActivityModuleBadge module={log.module} />
              <span className="text-xs font-bold uppercase">{log.action}</span>
            </div>
            <p className="text-sm">{log.description ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Performed By</h4>
            <DetailRow label="User" value={log.userName} />
            <DetailRow label="Role" value={log.userRole} />
            <DetailRow label="Status" value={log.status} />
            <DetailRow
              label="Duration"
              value={log.durationMs ? `${log.durationMs}ms` : undefined}
            />
          </div>

          {diffKeys.size > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">
                Change Comparison
              </h4>
              {Array.from(diffKeys).map((key) => (
                <DiffRow key={key} label={key} oldVal={oldObj?.[key]} newVal={newObj?.[key]} />
              ))}
            </div>
          )}

          <div className="rounded-xl border p-3">
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Technical Details
            </h4>
            <DetailRow label="IP Address" value={log.ipAddress} />
            <DetailRow label="MAC Address" value={log.detail?.macAddress} />
            <DetailRow label="Browser" value={log.browser} />
            <DetailRow label="OS" value={log.detail?.os} />
            <DetailRow label="Device" value={log.device} />
            <DetailRow label="Location" value={log.location} />
            <DetailRow label="Session ID" value={log.sessionId} />
            <DetailRow label="Request URL" value={log.detail?.requestUrl} />
            <DetailRow label="API Endpoint" value={log.detail?.apiEndpoint} />
            <DetailRow label="Related Record" value={log.detail?.relatedRecord ?? log.entityId} />
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export { highlight };
