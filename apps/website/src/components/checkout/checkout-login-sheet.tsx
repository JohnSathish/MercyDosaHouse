'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { isCustomer, type AuthUser } from '@mdh/auth-client';
import { clearUserSessionQueries } from '@/lib/auth-queries';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CustomerLoginForm } from '@/components/auth/customer-login-form';

export function CheckoutLoginSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [accountError, setAccountError] = useState('');

  async function handleAuthenticated(user: AuthUser) {
    if (!isCustomer(user)) {
      setAccountError('Please use a customer account');
      return;
    }
    setAccountError('');
    clearUserSessionQueries(queryClient);
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Login to continue
          </SheetTitle>
          <p className="text-sm text-muted-foreground pr-8">
            Your cart is saved. Login to use saved addresses and reward points.
          </p>
        </SheetHeader>

        <div className="px-5 pb-8 pt-2 overflow-y-auto">
          {accountError ? (
            <p className="text-sm text-red-600 text-center mb-3">{accountError}</p>
          ) : null}
          <CustomerLoginForm
            compact
            fromCheckout
            onAuthenticated={handleAuthenticated}
            guestHref="/checkout"
            guestLabel="Continue without login"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
