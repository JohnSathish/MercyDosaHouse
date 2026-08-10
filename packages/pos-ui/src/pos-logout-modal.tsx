'use client';

import { useState } from 'react';
import { Button, Input, cn } from '@mdh/ui';
import { AlertTriangle, LogOut, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosLogoutModalProps {
  open: boolean;
  darkMode: boolean;
  cashierName?: string;
  shiftLabel?: string;
  openBillsCount: number;
  unsavedBillsCount: number;
  isManager?: boolean;
  onClose: () => void;
  onContinueWorking: () => void;
  onSaveDrafts: () => void;
  onLogoutAnyway: (managerPin?: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function PosLogoutModal({
  open,
  darkMode,
  cashierName,
  shiftLabel,
  openBillsCount,
  unsavedBillsCount,
  isManager,
  onClose,
  onContinueWorking,
  onSaveDrafts,
  onLogoutAnyway,
  onLogout,
}: PosLogoutModalProps) {
  const [step, setStep] = useState<'confirm' | 'active-bills' | 'manager-pin'>('confirm');
  const [managerPin, setManagerPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const hasActive = openBillsCount > 0 || unsavedBillsCount > 0;

  function handleInitialLogout() {
    setError('');
    if (hasActive) {
      setStep('active-bills');
    } else {
      void doLogout(onLogout);
    }
  }

  async function doLogout(fn: (pin?: string) => Promise<void>, pin?: string) {
    setLoading(true);
    setError('');
    try {
      await fn(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[320] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border overflow-hidden',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b',
            darkMode ? 'border-gray-800' : 'border-gray-100',
          )}
        >
          <h3 className="font-bold text-lg flex items-center gap-2">
            <LogOut className="h-5 w-5" /> Logout
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {step === 'confirm' && (
            <>
              <p className="text-sm text-gray-500">Are you sure you want to logout?</p>
              <div
                className={cn(
                  'rounded-xl p-3 text-sm space-y-1',
                  darkMode ? 'bg-gray-800' : 'bg-gray-50',
                )}
              >
                <p>
                  <span className="text-gray-400">Cashier:</span>{' '}
                  <strong>{cashierName ?? 'Staff'}</strong>
                </p>
                <p>
                  <span className="text-gray-400">Shift:</span>{' '}
                  <strong>{shiftLabel ?? 'Active'}</strong>
                </p>
                <p>
                  <span className="text-gray-400">Open Bills:</span>{' '}
                  <strong>{openBillsCount}</strong>
                </p>
                <p>
                  <span className="text-gray-400">Unsaved Bills:</span>{' '}
                  <strong>{unsavedBillsCount}</strong>
                </p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-bold"
                  style={{ background: POS_THEME.primary }}
                  disabled={loading}
                  onClick={handleInitialLogout}
                >
                  {loading ? 'Logging out…' : 'Logout'}
                </Button>
              </div>
            </>
          )}

          {step === 'active-bills' && (
            <>
              <div className="flex gap-2 items-start text-amber-600">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">You have active bills</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose an action before leaving the terminal.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={onContinueWorking}
                >
                  Continue Working
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onSaveDrafts();
                    onClose();
                  }}
                >
                  Save All as Draft
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-amber-700"
                  onClick={() => setStep('manager-pin')}
                >
                  Logout Anyway {isManager ? '' : '(Manager PIN Required)'}
                </Button>
              </div>
            </>
          )}

          {step === 'manager-pin' && (
            <>
              <p className="text-sm text-gray-500">
                Manager approval required to logout with open bills.
              </p>
              <Input
                type="password"
                placeholder="Manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                className={cn(darkMode ? 'bg-gray-800 border-gray-700' : '')}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('active-bills')}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 font-bold"
                  style={{ background: POS_THEME.primary }}
                  disabled={loading || !managerPin}
                  onClick={() => void doLogout(onLogoutAnyway, managerPin)}
                >
                  {loading ? 'Logging out…' : 'Confirm Logout'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
