'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, cn } from '@mdh/ui';
import type { BusinessSettingsDto } from '@mdh/types';
import { DEFAULT_TERMINAL_SETTINGS, type PosTerminalSettings } from './pos-terminal-settings';
import { POS_THEME } from './pos-theme';
import { ThermalReceiptPreview } from './thermal-receipt-preview';
import { mergeReceiptPrintSettings } from './printing/receipt-settings';
import type { PosBillDto } from '@mdh/types';
import { X } from 'lucide-react';

const TABS = [
  'Preferences',
  'Receipt',
  'Billing',
  'Printer',
  'Kitchen',
  'Security',
  'Appearance',
  'System',
] as const;

type SettingsTab = (typeof TABS)[number];

interface PosSettingsModalProps {
  open: boolean;
  darkMode: boolean;
  settings: PosTerminalSettings;
  businessSettings?: BusinessSettingsDto | null;
  cashierName?: string;
  branchName?: string;
  previewBill?: PosBillDto | null;
  logoUrl?: string;
  online?: boolean;
  printerOk?: boolean;
  onClose: () => void;
  onSave: (settings: PosTerminalSettings) => Promise<void>;
  onReset: () => void;
  onLock: () => void;
  onTestPrint?: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
  darkMode,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  darkMode: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
    </label>
  );
}

export function PosSettingsModal({
  open,
  darkMode,
  settings,
  businessSettings,
  cashierName,
  branchName,
  previewBill,
  logoUrl,
  online = true,
  printerOk = true,
  onClose,
  onSave,
  onReset,
  onLock,
  onTestPrint,
}: PosSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>('Preferences');
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTab('Preferences');
      setError('');
    }
  }, [open, settings]);

  if (!open) return null;

  const patch = (p: Partial<PosTerminalSettings>) => setDraft((d) => ({ ...d, ...p }));

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const receiptSettings = mergeReceiptPrintSettings(
    {
      ...businessSettings,
      receiptFooterMessage: draft.receiptFooterMessage,
      receiptPaperWidth: draft.receiptPaperWidth,
      receiptShowQr: draft.receiptShowQr,
      receiptAutoPrintPayment: draft.autoPrintPayment,
      receiptAutoPrintKot: draft.autoPrintKot,
      receiptFontSize: draft.fontSize,
    },
    logoUrl,
  );

  return (
    <div className="fixed inset-0 z-[310] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
      <div
        className={cn(
          'w-full max-w-4xl max-h-[92vh] rounded-2xl border flex flex-col overflow-hidden',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b shrink-0',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <div>
            <h2 className="font-bold text-lg">POS Settings</h2>
            <p className="text-xs text-gray-400">
              Terminal configuration · changes persist after save
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav
            className={cn(
              'w-40 shrink-0 border-r overflow-y-auto p-2 space-y-0.5',
              darkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-100 bg-gray-50',
            )}
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition',
                  tab === t
                    ? 'text-white'
                    : darkMode
                      ? 'text-gray-400 hover:bg-gray-800'
                      : 'text-gray-600 hover:bg-white',
                )}
                style={tab === t ? { background: POS_THEME.primary } : undefined}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {tab === 'Preferences' && (
              <>
                <Section title="POS Preferences" dark={darkMode}>
                  <Field
                    label="Branch"
                    value={draft.branch}
                    onChange={(v) => patch({ branch: v })}
                    dark={darkMode}
                  />
                  <Field
                    label="Terminal Name"
                    value={draft.terminalName}
                    onChange={(v) => patch({ terminalName: v })}
                    dark={darkMode}
                  />
                  <Field label="Cashier" value={cashierName ?? ''} readOnly dark={darkMode} />
                  <Field
                    label="Business Date"
                    value={draft.businessDate}
                    onChange={(v) => patch({ businessDate: v })}
                    dark={darkMode}
                    type="date"
                  />
                  <SelectField
                    label="Default Order Type"
                    value={draft.defaultOrderType}
                    options={['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ONLINE_PICKUP', 'STAFF_MEAL']}
                    onChange={(v) =>
                      patch({ defaultOrderType: v as PosTerminalSettings['defaultOrderType'] })
                    }
                    dark={darkMode}
                  />
                  <SelectField
                    label="Default Payment"
                    value={draft.defaultPaymentMethod}
                    options={['CASH', 'UPI', 'CARD', 'WALLET']}
                    onChange={(v) =>
                      patch({
                        defaultPaymentMethod: v as PosTerminalSettings['defaultPaymentMethod'],
                      })
                    }
                    dark={darkMode}
                  />
                  <Toggle
                    checked={draft.autoSelectTable}
                    onChange={(v) => patch({ autoSelectTable: v })}
                    label="Auto Select Table"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.autoPrintPayment}
                    onChange={(v) => patch({ autoPrintPayment: v })}
                    label="Auto Print After Payment"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.autoPrintKot}
                    onChange={(v) => patch({ autoPrintKot: v })}
                    label="Auto Print KOT"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.autoOpenCashDrawer}
                    onChange={(v) => patch({ autoOpenCashDrawer: v })}
                    label="Auto Open Cash Drawer"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.enableBarcodeScanner}
                    onChange={(v) => patch({ enableBarcodeScanner: v })}
                    label="Enable Barcode Scanner"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.enableKeyboardShortcuts}
                    onChange={(v) => patch({ enableKeyboardShortcuts: v })}
                    label="Enable Keyboard Shortcuts"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.enableSound}
                    onChange={(v) => patch({ enableSound: v })}
                    label="Enable Sound Notifications"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.enableDarkMode}
                    onChange={(v) => patch({ enableDarkMode: v })}
                    label="Enable Dark Mode"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.enableFullscreen}
                    onChange={(v) => patch({ enableFullscreen: v })}
                    label="Enable Full Screen Mode"
                    darkMode={darkMode}
                  />
                </Section>
              </>
            )}

            {tab === 'Receipt' && (
              <>
                <Section title="Receipt Settings" dark={darkMode}>
                  <Field
                    label="Header Text"
                    value={draft.receiptHeaderText}
                    onChange={(v) => patch({ receiptHeaderText: v })}
                    dark={darkMode}
                  />
                  <Field
                    label="Footer Message"
                    value={draft.receiptFooterMessage}
                    onChange={(v) => patch({ receiptFooterMessage: v })}
                    dark={darkMode}
                  />
                  <Field
                    label="GST Number"
                    value={businessSettings?.gstNumber ?? ''}
                    readOnly
                    dark={darkMode}
                  />
                  <SelectField
                    label="Receipt Width"
                    value={draft.receiptPaperWidth}
                    options={['58mm', '80mm']}
                    onChange={(v) => patch({ receiptPaperWidth: v as '58mm' | '80mm' })}
                    dark={darkMode}
                  />
                  <Toggle
                    checked={draft.receiptShowQr}
                    onChange={(v) => patch({ receiptShowQr: v })}
                    label="Print QR Code"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.printCustomerCopy}
                    onChange={(v) => patch({ printCustomerCopy: v })}
                    label="Print Customer Copy"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.printKitchenCopy}
                    onChange={(v) => patch({ printKitchenCopy: v })}
                    label="Print Kitchen Copy"
                    darkMode={darkMode}
                  />
                  <Toggle
                    checked={draft.printDuplicateCopy}
                    onChange={(v) => patch({ printDuplicateCopy: v })}
                    label="Print Duplicate Copy"
                    darkMode={darkMode}
                  />
                </Section>
                {previewBill && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Receipt Preview</p>
                    <ThermalReceiptPreview
                      bill={previewBill}
                      businessName={draft.receiptHeaderText}
                      settings={receiptSettings}
                      cashierName={cashierName}
                    />
                  </div>
                )}
              </>
            )}

            {tab === 'Billing' && (
              <Section title="Billing Settings" dark={darkMode}>
                <Field
                  label="Packing Charge (₹)"
                  value={String(draft.packingCharge)}
                  onChange={(v) => patch({ packingCharge: parseFloat(v) || 0 })}
                  dark={darkMode}
                />
                <Field
                  label="Delivery Charge (₹)"
                  value={String(draft.deliveryCharge)}
                  onChange={(v) => patch({ deliveryCharge: parseFloat(v) || 0 })}
                  dark={darkMode}
                />
                <Field
                  label="Service Charge (%)"
                  value={String(draft.serviceChargePercent)}
                  onChange={(v) => patch({ serviceChargePercent: parseFloat(v) || 0 })}
                  dark={darkMode}
                />
                <Field
                  label="Manager Approval Limit (₹)"
                  value={String(draft.managerApprovalLimit)}
                  onChange={(v) => patch({ managerApprovalLimit: parseFloat(v) || 0 })}
                  dark={darkMode}
                />
                <Field
                  label="Minimum Order Value (₹)"
                  value={String(draft.minOrderValue)}
                  onChange={(v) => patch({ minOrderValue: parseFloat(v) || 0 })}
                  dark={darkMode}
                />
                <Toggle
                  checked={draft.roundOff}
                  onChange={(v) => patch({ roundOff: v })}
                  label="Round Off Totals"
                  darkMode={darkMode}
                />
                <Toggle
                  checked={draft.requirePinDiscount}
                  onChange={(v) => patch({ requirePinDiscount: v })}
                  label="Require Manager PIN for Discount"
                  darkMode={darkMode}
                />
              </Section>
            )}

            {tab === 'Printer' && (
              <Section title="Printer Settings" dark={darkMode}>
                <p className="text-gray-400 text-xs">Thermal printer via browser print dialog.</p>
                <Field label="Printer" value="System Default Thermal" readOnly dark={darkMode} />
                <Toggle
                  checked={true}
                  onChange={() => {}}
                  label="Auto Connect"
                  darkMode={darkMode}
                />
                <Button type="button" variant="outline" size="sm" onClick={onTestPrint}>
                  Test Print
                </Button>
              </Section>
            )}

            {tab === 'Kitchen' && (
              <Section title="Kitchen Settings" dark={darkMode}>
                <Toggle
                  checked={draft.enableKds}
                  onChange={(v) => patch({ enableKds: v })}
                  label="Enable KDS"
                  darkMode={darkMode}
                />
                <Toggle
                  checked={draft.autoSendKot}
                  onChange={(v) => patch({ autoSendKot: v })}
                  label="Auto Send KOT"
                  darkMode={darkMode}
                />
                <Toggle
                  checked={draft.kdsSoundAlerts}
                  onChange={(v) => patch({ kdsSoundAlerts: v })}
                  label="Kitchen Sound Alerts"
                  darkMode={darkMode}
                />
              </Section>
            )}

            {tab === 'Security' && (
              <Section title="Security" dark={darkMode}>
                <Field
                  label="Session Timeout (minutes)"
                  value={String(draft.sessionTimeoutMinutes)}
                  onChange={(v) => patch({ sessionTimeoutMinutes: parseInt(v, 10) || 480 })}
                  dark={darkMode}
                />
                <Toggle
                  checked={draft.requirePinVoid}
                  onChange={(v) => patch({ requirePinVoid: v })}
                  label="Require Manager PIN for Void"
                  darkMode={darkMode}
                />
                <Toggle
                  checked={draft.requirePinDiscount}
                  onChange={(v) => patch({ requirePinDiscount: v })}
                  label="Require Manager PIN for Discount"
                  darkMode={darkMode}
                />
                <Button type="button" variant="outline" className="mt-2" onClick={onLock}>
                  Lock POS Now
                </Button>
                <p className="text-[10px] text-gray-400 mt-1">Shortcut: Ctrl+L</p>
              </Section>
            )}

            {tab === 'Appearance' && (
              <Section title="Appearance" dark={darkMode}>
                <SelectField
                  label="Theme"
                  value={draft.theme}
                  options={['default', 'light', 'dark']}
                  onChange={(v) => patch({ theme: v as PosTerminalSettings['theme'] })}
                  dark={darkMode}
                />
                <Field
                  label="Accent Color"
                  value={draft.accentColor}
                  onChange={(v) => patch({ accentColor: v })}
                  dark={darkMode}
                  type="color"
                />
                <SelectField
                  label="Font Size"
                  value={draft.fontSize}
                  options={['small', 'normal', 'large']}
                  onChange={(v) => patch({ fontSize: v as PosTerminalSettings['fontSize'] })}
                  dark={darkMode}
                />
                <Toggle
                  checked={draft.compactMode}
                  onChange={(v) => patch({ compactMode: v })}
                  label="Compact Mode"
                  darkMode={darkMode}
                />
                <Toggle
                  checked={draft.touchMode}
                  onChange={(v) => patch({ touchMode: v })}
                  label="Touch Mode (larger tap targets)"
                  darkMode={darkMode}
                />
              </Section>
            )}

            {tab === 'System' && (
              <Section title="System Information" dark={darkMode}>
                <InfoRow label="POS Version" value="1.0.0" />
                <InfoRow label="Build" value="2026.08.09" />
                <InfoRow label="Database" value={online ? 'Connected' : 'Offline'} />
                <InfoRow label="Printer" value={printerOk ? 'Ready' : 'Unavailable'} />
                <InfoRow label="Network" value={online ? 'Online' : 'Offline'} />
                <InfoRow label="Sync" value={online ? 'Synced' : 'Pending'} />
                <InfoRow label="Current User" value={cashierName ?? '—'} />
                <InfoRow label="Branch" value={branchName ?? draft.branch} />
              </Section>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <div
          className={cn(
            'flex gap-2 p-4 border-t shrink-0',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onReset();
              setDraft({ ...DEFAULT_TERMINAL_SETTINGS });
            }}
            disabled={saving}
          >
            Reset to Default
          </Button>
          <Button
            className="ml-auto font-bold px-8"
            style={{ background: POS_THEME.primary }}
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  dark,
  children,
}: {
  title: string;
  dark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className={cn('font-bold text-sm mb-3', dark ? 'text-white' : 'text-gray-900')}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dark,
  readOnly,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  dark: boolean;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-400">{label}</Label>
      <Input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          'mt-1 h-9 text-sm',
          dark ? 'bg-gray-800 border-gray-700' : '',
          readOnly && 'opacity-70',
        )}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  dark,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  dark: boolean;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-400">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-1 w-full h-9 rounded-md border px-2 text-sm',
          dark ? 'bg-gray-800 border-gray-700' : 'border-gray-200',
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-dashed border-gray-200/50 text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
