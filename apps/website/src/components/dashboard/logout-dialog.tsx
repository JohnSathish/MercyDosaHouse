'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@mdh/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function LogoutDialog({ open, onOpenChange, onConfirm, loading }: LogoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logout?</DialogTitle>
          <DialogDescription>Are you sure you want to logout?</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
            onClick={onConfirm}
            disabled={loading}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
