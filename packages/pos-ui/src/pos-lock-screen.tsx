'use client';

import { useState } from 'react';
import { Button, Input, cn } from '@mdh/ui';
import { Lock } from 'lucide-react';
import { POS_THEME } from './pos-theme';

interface PosLockScreenProps {
  cashierName?: string;
  darkMode: boolean;
  onUnlock: (password: string) => Promise<boolean>;
}

export function PosLockScreen({ cashierName, darkMode, onUnlock }: PosLockScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await onUnlock(password);
      if (!ok) setError('Incorrect password. Try again.');
      else setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className={cn(
          'w-full max-w-sm rounded-2xl border p-6 space-y-4',
          darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200',
        )}
        style={{ boxShadow: POS_THEME.shadowLg }}
      >
        <div className="text-center">
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3"
            style={{ background: POS_THEME.primary }}
          >
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">POS Locked</h2>
          <p className="text-sm text-gray-400 mt-1">
            {cashierName ?? 'Cashier'} · Enter password to unlock
          </p>
        </div>
        <Input
          type="password"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn('h-11', darkMode ? 'bg-gray-800 border-gray-700' : '')}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          type="submit"
          className="w-full h-11 font-bold"
          style={{ background: POS_THEME.primary }}
          disabled={loading || !password}
        >
          {loading ? 'Unlocking…' : 'Unlock POS'}
        </Button>
      </form>
    </div>
  );
}
