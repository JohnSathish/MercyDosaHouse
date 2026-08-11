'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, cn } from '@mdh/ui';
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import type { OrderNotificationRecipientDto } from '@mdh/types';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function OrderNotificationEmailsPanel() {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderNotificationRecipientDto | null>(null);
  const [editing, setEditing] = useState<OrderNotificationRecipientDto | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['order-notification-emails'],
    queryFn: () => api.get<OrderNotificationRecipientDto[]>('/settings/order-notification-emails'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['order-notification-emails'] });
    queryClient.invalidateQueries({ queryKey: ['email-status'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const email = normalizeEmail(emailInput);
      if (!email) throw new Error('Email address is required');
      if (!EMAIL_REGEX.test(email)) throw new Error('Enter a valid email address');
      if (editing) {
        return api.patch<OrderNotificationRecipientDto>(
          `/settings/order-notification-emails/${editing.id}`,
          { email },
        );
      }
      return api.post<OrderNotificationRecipientDto>('/settings/order-notification-emails', {
        email,
      });
    },
    onSuccess: () => {
      invalidate();
      toast(editing ? 'Email updated' : 'Email added');
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/settings/order-notification-emails/${id}`, { isActive }),
    onSuccess: () => {
      invalidate();
      toast('Status updated');
    },
    onError: (err: Error) => toast(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/order-notification-emails/${id}`),
    onSuccess: () => {
      invalidate();
      toast('Email removed');
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast(err.message),
  });

  function openAdd() {
    setEditing(null);
    setEmailInput('');
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(row: OrderNotificationRecipientDto) {
    setEditing(row);
    setEmailInput(row.email);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setEmailInput('');
    setFormError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#14532D] flex items-center gap-2">
            <Mail className="h-5 w-5 shrink-0" />
            Order Notification Emails
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            All active email addresses listed here will receive a notification whenever a new order
            is successfully confirmed.
          </p>
        </div>
        <Button
          className="bg-[#14532D] hover:bg-[#14532D]/90 w-full sm:w-auto min-h-[44px] shrink-0"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Email
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Email Address</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : recipients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No notification emails configured yet. Add one to start receiving order alerts.
                </td>
              </tr>
            ) : (
              recipients.map((row) => (
                <RecipientRow
                  key={row.id}
                  row={row}
                  onEdit={() => openEdit(row)}
                  onToggle={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                  onDelete={() => setDeleteTarget(row)}
                  togglePending={toggleMutation.isPending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No notification emails configured yet.
          </p>
        ) : (
          recipients.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium break-all">{row.email}</p>
                <StatusBadge active={row.isActive} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                  disabled={toggleMutation.isPending}
                >
                  {row.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={() => setDeleteTarget(row)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Email' : 'Add Email'}</DialogTitle>
            <DialogDescription>
              Order confirmation emails will be sent to all active addresses.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="notification-email" className="text-sm font-medium">
              Email address
            </label>
            <input
              id="notification-email"
              type="email"
              autoComplete="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setFormError(null);
              }}
              placeholder="name@example.com"
              className="mt-1 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14532D]/30"
            />
            {formError ? <p className="text-sm text-red-600 mt-2">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-[44px]" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="bg-[#14532D] min-h-[44px]"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete notification email?</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteTarget?.email}</strong>? This address will stop receiving order
              notifications immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px]"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 bg-gray-50 text-gray-500',
      )}
    >
      {active ? '🟢 Active' : '⚪ Disabled'}
    </Badge>
  );
}

function RecipientRow({
  row,
  onEdit,
  onToggle,
  onDelete,
  togglePending,
}: {
  row: OrderNotificationRecipientDto;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  togglePending: boolean;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="px-4 py-3 font-medium break-all">{row.email}</td>
      <td className="px-4 py-3">
        <StatusBadge active={row.isActive} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" className="min-h-[36px]" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[36px]"
            onClick={onToggle}
            disabled={togglePending}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="destructive" className="min-h-[36px]" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
