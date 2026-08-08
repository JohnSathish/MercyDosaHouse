'use client';

import { Camera, ShieldCheck, QrCode, PenLine } from 'lucide-react';
import { Badge } from '@mdh/ui';

const PROOF_METHODS = [
  {
    icon: PenLine,
    title: 'Customer Signature',
    description: 'Capture digital signature on delivery executive device before marking delivered.',
    status: 'Enabled',
  },
  {
    icon: Camera,
    title: 'Delivery Photo',
    description: 'Photo proof of order at customer doorstep for dispute resolution.',
    status: 'Enabled',
  },
  {
    icon: ShieldCheck,
    title: 'OTP Verification',
    description:
      '4-digit OTP sent via SMS/WhatsApp. Executive must enter OTP to complete delivery.',
    status: 'Enabled',
  },
  {
    icon: QrCode,
    title: 'QR Scan',
    description: 'Scan order QR code at delivery for instant verification.',
    status: 'Coming soon',
  },
];

export default function ProofOfDeliveryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6 text-[#14532D]" />
          Proof of Delivery
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure verification requirements before marking orders as delivered
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PROOF_METHODS.map(({ icon: Icon, title, description, status }) => (
          <div key={title} className="rounded-xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#14532D]/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-[#14532D]" />
              </div>
              <Badge
                variant={status === 'Enabled' ? 'default' : 'outline'}
                className={status === 'Enabled' ? 'bg-emerald-600 text-[10px]' : 'text-[10px]'}
              >
                {status}
              </Badge>
            </div>
            <h3 className="font-semibold mt-3">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-5">
        <h3 className="font-semibold text-amber-800 dark:text-amber-200">OTP Delivery Flow</h3>
        <ol className="mt-2 space-y-1 text-sm text-amber-900/80 dark:text-amber-100/80 list-decimal list-inside">
          <li>System generates OTP when order is out for delivery</li>
          <li>Customer receives OTP via SMS / WhatsApp</li>
          <li>Delivery executive enters OTP in rider app</li>
          <li>Order marked Delivered only after OTP verification</li>
        </ol>
      </div>
    </div>
  );
}
