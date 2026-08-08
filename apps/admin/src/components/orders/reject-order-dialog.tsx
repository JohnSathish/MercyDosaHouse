'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@mdh/ui';

const REJECT_REASONS = ['Out of Stock', 'Kitchen Closed', 'Unable to Deliver', 'Other'] as const;

interface RejectOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: RejectOrderDialogProps) {
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const handleReject = () => {
    const finalReason = reason === 'Other' ? customReason.trim() || 'Other' : reason;
    onConfirm(finalReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Order</DialogTitle>
          <DialogDescription>Select a reason. The customer will be notified.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {REJECT_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="reject-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {r}
            </label>
          ))}
          {reason === 'Other' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full rounded-xl border p-3 text-sm min-h-[80px]"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? 'Rejecting...' : 'Reject Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
