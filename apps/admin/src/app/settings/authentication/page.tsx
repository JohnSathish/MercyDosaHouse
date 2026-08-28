'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Mail } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@mdh/ui';
import { api } from '@/lib/api';
import type { AuthConfigDto } from '@mdh/types';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
        {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={checked ? 'default' : 'outline'}
        disabled={disabled}
        className={checked ? 'bg-[#0B3D24] hover:bg-[#0B3D24]/90' : ''}
        onClick={() => onChange(!checked)}
      >
        {checked ? 'On' : 'Off'}
      </Button>
    </div>
  );
}

export default function EmailAuthenticationSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings-auth'],
    queryFn: () => api.get<AuthConfigDto>('/settings/auth'),
  });

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    if (!data) return;
    setSenderName(data.senderName);
    setSenderEmail(data.senderEmail);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Partial<AuthConfigDto>) => api.patch<AuthConfigDto>('/settings/auth', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-auth'] }),
  });

  const testEmail = useMutation({
    mutationFn: () =>
      api.post<{ sent: boolean; error?: string }>('/settings/email/test', {
        to: testTo.trim() || undefined,
        kind: 'login-otp',
      }),
  });

  const expiryMinutes = data ? Math.round(data.otpExpirySeconds / 60) : 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Email & Authentication
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customer Email OTP, Google login, and coming-soon Mobile OTP. SMTP passwords stay on the
          server and are never shown here.
        </p>
      </div>

      <Card className="dark:bg-gray-900">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#0B3D24]/10 p-2.5 text-[#0B3D24]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Email delivery</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Login OTPs are sent from the configured sender name. Host, port, and password are
                environment secrets only.
              </p>
            </div>
          </div>

          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading email settings…</p>
          ) : (
            <>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-3 text-sm">
                <p>
                  Status:{' '}
                  <span
                    className={
                      data.emailStatus?.configured
                        ? 'text-emerald-700 font-semibold'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {data.emailStatus?.configured ? 'Configured' : 'Not configured'}
                  </span>
                </p>
                <p className="text-muted-foreground mt-1">{data.emailStatus?.message}</p>
                {data.emailStatus?.fromDisplay ? (
                  <p className="text-muted-foreground mt-1">From: {data.emailStatus.fromDisplay}</p>
                ) : null}
                {data.emailStatus?.missing?.length ? (
                  <p className="text-red-600 text-xs mt-1">
                    Missing env: {data.emailStatus.missing.join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sender-name">Sender Name</Label>
                  <Input
                    id="sender-name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    onBlur={() => {
                      if (senderName.trim() && senderName !== data.senderName) {
                        save.mutate({ senderName: senderName.trim() });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sender-email">Sender Email</Label>
                  <Input
                    id="sender-email"
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    onBlur={() => {
                      if (senderEmail.trim() && senderEmail !== data.senderEmail) {
                        save.mutate({ senderEmail: senderEmail.trim() });
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Display address only. SMTP username/password are not stored in Admin.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <Label htmlFor="test-to">Send Test Email</Label>
                  <Input
                    id="test-to"
                    type="email"
                    placeholder="you@example.com"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={testEmail.isPending || !testTo.includes('@')}
                  onClick={() => testEmail.mutate()}
                >
                  {testEmail.isPending ? 'Sending…' : 'Send Test OTP Email'}
                </Button>
              </div>
              {testEmail.data?.sent ? (
                <p className="text-sm text-emerald-600">
                  Test OTP email sent. Check the inbox (and spam).
                </p>
              ) : null}
              {testEmail.data?.error ? (
                <p className="text-sm text-red-600">{testEmail.data.error}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#0B3D24]/10 p-2.5 text-[#0B3D24]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Customer login methods
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Google also requires <code>GOOGLE_CLIENT_ID</code> on the API. Mobile OTP stays off
                until an SMS provider is live.
              </p>
            </div>
          </div>

          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading authentication settings…</p>
          ) : (
            <>
              <ToggleRow
                label="Email OTP"
                description="Primary customer login. Sends a 6-digit code to the customer’s email."
                checked={data.emailOtp}
                onChange={(emailOtp) => save.mutate({ emailOtp })}
                disabled={save.isPending}
              />
              <ToggleRow
                label="Google login"
                description="Links by verified Google email. Hidden on clients if Google Client ID is missing."
                checked={data.google}
                onChange={(google) => save.mutate({ google })}
                disabled={save.isPending}
              />
              <ToggleRow
                label="Mobile OTP"
                description="Coming soon. When off, customers see a disabled option and SMS is never sent."
                checked={data.mobileOtp}
                onChange={(mobileOtp) => save.mutate({ mobileOtp })}
                disabled={save.isPending}
              />
              <ToggleRow
                label="Guest checkout"
                description="Allow browsing and cart without an account. Login is still required for order history."
                checked={data.guest}
                onChange={(guest) => save.mutate({ guest })}
                disabled={save.isPending}
              />

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div>
                  <Label htmlFor="otp-expiry">OTP expiry (minutes)</Label>
                  <Input
                    id="otp-expiry"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={expiryMinutes}
                    onBlur={(e) => {
                      const otpExpirySeconds = Number(e.target.value) * 60;
                      if (otpExpirySeconds !== data.otpExpirySeconds) {
                        save.mutate({ otpExpirySeconds });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="otp-cooldown">Resend cooldown (seconds)</Label>
                  <Input
                    id="otp-cooldown"
                    type="number"
                    min={15}
                    max={300}
                    defaultValue={data.resendCooldownSeconds}
                    onBlur={(e) => {
                      const resendCooldownSeconds = Number(e.target.value);
                      if (resendCooldownSeconds !== data.resendCooldownSeconds) {
                        save.mutate({ resendCooldownSeconds });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="otp-attempts">Max attempts</Label>
                  <Input
                    id="otp-attempts"
                    type="number"
                    min={3}
                    max={10}
                    defaultValue={data.maxAttempts}
                    onBlur={(e) => {
                      const maxAttempts = Number(e.target.value);
                      if (maxAttempts !== data.maxAttempts) {
                        save.mutate({ maxAttempts });
                      }
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
