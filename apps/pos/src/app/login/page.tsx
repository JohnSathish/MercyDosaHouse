'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@mdh/ui';
import { login } from '@mdh/auth-client';
import { userHasRole, STAFF_ROLES } from '@mdh/auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function PosLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await login(API_URL, { email, password });
      if (!userHasRole(user, STAFF_ROLES)) {
        setError('POS access requires staff credentials');
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4"
      >
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-emerald-400">Mercy Dosa House</h1>
          <p className="text-sm text-gray-400">Restaurant POS Terminal</p>
        </div>
        <div>
          <Label className="text-gray-300">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label className="text-gray-300">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Open POS'}
        </Button>
        <p className="text-xs text-center text-gray-500">Cashier: cashier@mercydosahouse.com</p>
      </form>
    </div>
  );
}
