'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@mdh/ui';

export const Sheet = DialogPrimitive.Root;

type SheetSide = 'left' | 'right' | 'bottom';

const SIDE_CLASSES: Record<SheetSide, string> = {
  left: 'inset-y-0 left-0 h-full w-full max-w-[min(100vw,320px)] border-r',
  right: 'inset-y-0 right-0 h-full w-full max-w-lg border-l',
  bottom:
    'inset-x-0 bottom-0 w-full max-h-[min(92vh,720px)] rounded-t-2xl border-t animate-in slide-in-from-bottom duration-300',
};

export function SheetContent({
  side = 'right',
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: SheetSide }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col bg-white dark:bg-gray-900 shadow-2xl outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          SIDE_CLASSES[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center',
            'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            side === 'bottom' ? 'right-3 top-3' : 'right-3 top-3',
          )}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b px-4 sm:px-6 py-4 pr-14 shrink-0', className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-bold', className)} {...props} />;
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t px-4 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap gap-2 shrink-0',
        className,
      )}
      {...props}
    />
  );
}
