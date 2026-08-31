import { getAccessToken } from '@mdh/auth-client';
import { API_URL } from '@/lib/api';

export async function fetchInvoicePdf(id: string, inline = false): Promise<Blob> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/invoices/${id}/pdf${inline ? '?download=0' : ''}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (typeof err.message === 'string' && err.message) || 'Could not download invoice PDF',
    );
  }
  return res.blob();
}

export async function downloadInvoicePdf(id: string, filename?: string) {
  const blob = await fetchInvoicePdf(id, false);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'invoice.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

export async function previewInvoicePdf(id: string) {
  const blob = await fetchInvoicePdf(id, true);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function printInvoicePdf(id: string) {
  const blob = await fetchInvoicePdf(id, true);
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = url;
  document.body.appendChild(frame);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
}

export function inr(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
