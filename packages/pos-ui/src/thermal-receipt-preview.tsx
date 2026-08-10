'use client';

import { useEffect, useRef } from 'react';
import type { PosBillDto, PosReceiptDto } from '@mdh/types';
import type { PosReceiptPrintSettings } from './printing/receipt-settings';
import { buildReceiptPreviewHtml } from './printing/print-service';

interface ThermalReceiptPreviewProps {
  bill: PosBillDto | PosReceiptDto;
  businessName: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  branchName?: string;
  cashierName?: string;
  settings: PosReceiptPrintSettings;
  className?: string;
}

/** On-screen preview matching thermal print output (80mm / 58mm). */
export function ThermalReceiptPreview(props: ThermalReceiptPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const width = props.settings.paperWidth;

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    void buildReceiptPreviewHtml({
      bill: props.bill,
      businessName: props.businessName,
      tagline: props.tagline,
      phone: props.phone,
      whatsapp: props.whatsapp,
      address: props.address,
      branchName: props.branchName,
      cashierName: props.cashierName,
      settings: props.settings,
      copyType: 'customer',
    }).then((html) => {
      doc.open();
      doc.write(html);
      doc.close();
    });
  }, [props]);

  return (
    <div
      className={`mx-auto bg-gray-100 p-4 rounded-xl ${props.className ?? ''}`}
      style={{ maxWidth: width === '58mm' ? 240 : 320 }}
    >
      <iframe
        ref={iframeRef}
        title="Receipt preview"
        className="w-full border-0 bg-white shadow-md mx-auto block"
        style={{ width, minHeight: 360 }}
      />
    </div>
  );
}
