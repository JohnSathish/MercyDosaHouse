'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CartContent } from '@/components/cart/cart-content';
import { useUiStore } from '@/lib/ui-store';

export function CartSheet() {
  const { cartOpen, setCartOpen } = useUiStore();

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="bottom" className="px-4 pb-6 safe-area-pb">
        <SheetHeader className="px-0">
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(92vh-80px)]">
          <CartContent compact onCheckout={() => setCartOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
