export type InvoiceEmailKind =
  | 'CREATED'
  | 'SENT'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_OVERDUE'
  | 'UPDATED'
  | 'CANCELLED';

export type InvoiceEmailSummaryRow = {
  label: string;
  amount: number;
  emphasize?: boolean;
  muted?: boolean;
};

export type InvoiceEmailPayload = {
  kind: InvoiceEmailKind;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  paymentMethod?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharge: number;
  packingCharge: number;
  otherCharges: number;
  otherChargesLabel?: string | null;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  summaryRows: InvoiceEmailSummaryRow[];
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  showBank: boolean;
  phone?: string | null;
  email?: string | null;
  website: string;
  address?: string | null;
  logoUrl: string;
  downloadUrl: string;
  fileName: string;
  fileSizeLabel: string;
  footerNote?: string | null;
  tagline?: string | null;
};

const GREEN = '#14532D';
const CREAM = '#F8F4E8';
const GOLD = '#C9A227';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInr(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

type Badge = { bg: string; color: string; label: string };

function statusBadge(status: string): Badge {
  switch (status) {
    case 'PAID':
      return { bg: '#D1FAE5', color: '#065F46', label: 'PAID' };
    case 'PARTIALLY_PAID':
      return { bg: '#FFEDD5', color: '#9A3412', label: 'PARTIALLY PAID' };
    case 'OVERDUE':
      return { bg: '#FEE2E2', color: '#991B1B', label: 'OVERDUE' };
    case 'CANCELLED':
      return { bg: '#E5E7EB', color: '#374151', label: 'CANCELLED' };
    default:
      return { bg: '#FEF3C7', color: '#92400E', label: 'PENDING' };
  }
}

function copyForKind(kind: InvoiceEmailKind, status: string, balanceDue: number) {
  if (kind === 'CANCELLED') {
    return {
      eyebrow: 'INVOICE CANCELLED',
      intro: 'This invoice has been cancelled and no further payment is required.',
      statusNote: 'This invoice is no longer payable.',
    };
  }
  if (kind === 'PAYMENT_RECEIVED' || status === 'PAID') {
    return {
      eyebrow: 'PAYMENT RECEIVED',
      intro: 'Thank you. We have received your payment.',
      statusNote: 'Thank you for your payment.',
    };
  }
  if (kind === 'PAYMENT_OVERDUE' || status === 'OVERDUE') {
    return {
      eyebrow: 'PAYMENT REMINDER',
      intro: 'This is a friendly reminder that payment on your invoice is overdue.',
      statusNote: `Amount outstanding: ${formatInr(balanceDue)}`,
    };
  }
  if (kind === 'PAYMENT_PENDING' || status === 'PARTIALLY_PAID') {
    return {
      eyebrow: 'PAYMENT PENDING',
      intro: 'A partial payment has been recorded. The remaining balance is shown below.',
      statusNote: `Amount outstanding: ${formatInr(balanceDue)}`,
    };
  }
  if (kind === 'UPDATED') {
    return {
      eyebrow: 'INVOICE UPDATED',
      intro: 'Your invoice details have been updated. Please review the latest copy attached.',
      statusNote: status === 'UNPAID' ? `Amount due: ${formatInr(balanceDue)}` : undefined,
    };
  }
  return {
    eyebrow: kind === 'CREATED' ? 'INVOICE GENERATED' : 'YOUR INVOICE IS READY',
    intro: 'Your invoice is ready.',
    statusNote:
      status === 'OVERDUE' || status === 'UNPAID' || status === 'PARTIALLY_PAID'
        ? `Amount outstanding: ${formatInr(balanceDue)}`
        : undefined,
  };
}

export function defaultInvoiceEmailSubject(kind: InvoiceEmailKind, invoiceNumber: string): string {
  if (kind === 'PAYMENT_OVERDUE') {
    return `Payment Reminder — Invoice ${invoiceNumber} | Mercy Dosa House`;
  }
  if (kind === 'PAYMENT_RECEIVED') {
    return `Payment received — Invoice ${invoiceNumber} | Mercy Dosa House`;
  }
  if (kind === 'CANCELLED') {
    return `Invoice cancelled — ${invoiceNumber} | Mercy Dosa House`;
  }
  return `Invoice ${invoiceNumber} | Mercy Dosa House`;
}

export function renderInvoiceEmailSubject(
  kind: InvoiceEmailKind,
  invoiceNumber: string,
  templates?: { subject?: string; overdueSubject?: string },
): string {
  const vars = { invoice_number: invoiceNumber };
  if (kind === 'PAYMENT_OVERDUE' && templates?.overdueSubject?.trim()) {
    return applyTemplate(templates.overdueSubject.trim(), vars);
  }
  if (templates?.subject?.trim() && kind !== 'PAYMENT_OVERDUE') {
    return applyTemplate(templates.subject.trim(), vars);
  }
  return defaultInvoiceEmailSubject(kind, invoiceNumber);
}

export function renderInvoiceEmail(payload: InvoiceEmailPayload): { html: string; text: string } {
  const name = escapeHtml(payload.customerName || 'Customer');
  const invoiceNumber = escapeHtml(payload.invoiceNumber);
  const logoUrl = escapeHtml(payload.logoUrl);
  const website = escapeHtml(payload.website.replace(/^https?:\/\//, ''));
  const websiteHref = escapeHtml(
    payload.website.startsWith('http') ? payload.website : `https://${payload.website}`,
  );
  const downloadUrl = escapeHtml(payload.downloadUrl);
  const phone = payload.phone ? escapeHtml(payload.phone) : '';
  const email = payload.email ? escapeHtml(payload.email) : '';
  const address = payload.address ? escapeHtml(payload.address) : 'Tura, Meghalaya';
  const tagline = escapeHtml(payload.tagline || 'Authentic South Indian Flavours');
  const footerNote = escapeHtml(
    payload.footerNote || 'Thank you for your trust and continued support!',
  );
  const fileName = escapeHtml(payload.fileName);
  const fileSize = escapeHtml(payload.fileSizeLabel);
  const copy = copyForKind(payload.kind, payload.status, payload.balanceDue);
  const badge = statusBadge(payload.status);
  const invoiceDate = escapeHtml(formatDate(payload.invoiceDate));
  const dueDate = escapeHtml(formatDate(payload.dueDate));
  const dueLabel = payload.status === 'PAID' ? 'Paid' : formatInr(payload.balanceDue);

  const summaryRows = payload.summaryRows
    .filter((row) => row.emphasize || Math.abs(row.amount) > 0.004)
    .map((row) => {
      const amount = row.muted ? `−${formatInr(Math.abs(row.amount))}` : formatInr(row.amount);
      const weight = row.emphasize ? '700' : '400';
      const color = row.emphasize ? GREEN : TEXT;
      return `<tr>
        <td style="padding:8px 0;font-size:14px;color:${MUTED};font-weight:${weight};">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:8px 0;font-size:14px;color:${color};font-weight:${weight};">${amount}</td>
      </tr>`;
    })
    .join('');

  const bankRows: string[] = [];
  if (payload.showBank && payload.kind !== 'CANCELLED') {
    const add = (label: string, value?: string | null) => {
      if (!value?.trim()) return;
      bankRows.push(
        `<tr><td style="padding:4px 0;font-size:13px;color:${MUTED};width:140px;">${label}</td><td style="padding:4px 0;font-size:13px;color:${TEXT};font-weight:600;">${escapeHtml(value.trim())}</td></tr>`,
      );
    };
    add('Bank Name', payload.bankName);
    add('Account Name', payload.accountName);
    add('Account No', payload.accountNumber);
    add('IFSC', payload.ifsc);
    add('UPI', payload.upiId);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Georgia,'Times New Roman',Times,serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Invoice ${invoiceNumber} from Mercy Dosa House — ${escapeHtml(dueLabel)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${WHITE};border-radius:16px;overflow:hidden;border:1px solid #E8DFC8;">
          <tr>
            <td style="background:${GREEN};padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Mercy Dosa House logo" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:14px;background:${WHITE};padding:6px;border:0;" />
              <p style="margin:0;font-size:22px;font-weight:700;color:${WHITE};font-family:Georgia,serif;">Mercy Dosa House</p>
              <p style="margin:8px 0 0;font-size:13px;color:${GOLD};letter-spacing:0.04em;">${tagline}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#D1FAE5;">Crispy Dosas. Happy Hearts. &#10084;&#65039;</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;color:${GOLD};font-weight:700;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(copy.eyebrow)}</p>
              <p style="margin:16px 0 0;font-size:16px;color:${TEXT};text-align:left;font-family:Arial,Helvetica,sans-serif;">Dear ${name},</p>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:${TEXT};text-align:left;font-family:Arial,Helvetica,sans-serif;">
                Thank you for choosing Mercy Dosa House.<br />
                ${escapeHtml(copy.intro)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};border-radius:12px;border:1px solid #E8DFC8;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;color:${MUTED};font-family:Arial,Helvetica,sans-serif;">INVOICE NO.</p>
                    <p style="margin:4px 0 14px;font-size:20px;font-weight:700;color:${GREEN};font-family:Arial,Helvetica,sans-serif;">${invoiceNumber}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 12px 0 0;font-family:Arial,Helvetica,sans-serif;">
                          <p style="margin:0;font-size:11px;color:${MUTED};">Invoice Date</p>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${TEXT};">${invoiceDate}</p>
                        </td>
                        <td style="padding:0;font-family:Arial,Helvetica,sans-serif;">
                          <p style="margin:0;font-size:11px;color:${MUTED};">Due Date</p>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${TEXT};">${dueDate}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:11px;color:${MUTED};font-family:Arial,Helvetica,sans-serif;">${payload.status === 'PAID' ? 'TOTAL' : 'AMOUNT DUE'}</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:${GREEN};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(payload.status === 'PAID' ? formatInr(payload.grandTotal) : formatInr(payload.balanceDue))}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;color:${MUTED};">PAYMENT STATUS</p>
              <span style="display:inline-block;background:${badge.bg};color:${badge.color};font-size:12px;font-weight:700;letter-spacing:0.08em;padding:8px 16px;border-radius:999px;">${badge.label}</span>
              ${copy.statusNote ? `<p style="margin:12px 0 0;font-size:14px;color:${TEXT};">${escapeHtml(copy.statusNote)}</p>` : ''}
            </td>
          </tr>
          ${
            summaryRows
              ? `<tr><td style="padding:8px 28px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8DFC8;border-radius:12px;">
                <tr><td style="padding:16px 18px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${GREEN};">Invoice summary</td></tr>
                <tr><td style="padding:0 18px 12px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;">
                    ${summaryRows}
                  </table>
                </td></tr>
              </table>
            </td></tr>`
              : ''
          }
          <tr>
            <td style="padding:8px 28px 8px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${GREEN}" style="border-radius:10px;">
                    <a href="${downloadUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${WHITE};text-decoration:none;">Download Invoice</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F0;border:1px dashed ${GOLD};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:${GREEN};">Your invoice is ready</p>
                    <p style="margin:6px 0 0;font-size:13px;color:${TEXT};">${fileName}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:${MUTED};">PDF Invoice • ${fileSize}</p>
                    <p style="margin:10px 0 0;font-size:13px;color:${TEXT};">Your invoice PDF is attached to this email for your records.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            bankRows.length
              ? `<tr><td style="padding:16px 28px 8px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${GREEN};font-family:Arial,Helvetica,sans-serif;">Payment information</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;">
                ${bankRows.join('')}
              </table>
            </td></tr>`
              : ''
          }
          <tr>
            <td style="padding:20px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${GREEN};">Need help?</p>
              ${phone ? `<p style="margin:0 0 4px;font-size:13px;color:${TEXT};">Phone: ${phone}</p>` : ''}
              ${email ? `<p style="margin:0 0 4px;font-size:13px;color:${TEXT};">Email: ${email}</p>` : ''}
              <p style="margin:0 0 16px;font-size:13px;color:${TEXT};">Web: <a href="${websiteHref}" style="color:${GREEN};">${website}</a></p>
              <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${footerNote}</p>
            </td>
          </tr>
          <tr>
            <td style="background:${GREEN};padding:22px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;font-size:15px;font-weight:700;color:${WHITE};">Mercy Dosa House</p>
              <p style="margin:6px 0 0;font-size:12px;color:${GOLD};">${tagline}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#D1FAE5;">${address}</p>
              <p style="margin:10px 0 0;font-size:12px;color:#D1FAE5;">
                ${phone ? `${phone} · ` : ''}${email ? `${email} · ` : ''}${website}
              </p>
              <p style="margin:14px 0 0;font-size:12px;color:${GOLD};">Crispy Dosas. Happy Hearts. &#10084;&#65039;</p>
              <p style="margin:12px 0 0;font-size:11px;color:#9CA3AF;line-height:1.5;">This is an automated invoice email. Please do not reply if your system does not support replies.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `Mercy Dosa House`,
    payload.tagline || 'Authentic South Indian Flavours',
    '',
    `Dear ${payload.customerName || 'Customer'},`,
    '',
    'Thank you for choosing Mercy Dosa House.',
    copy.intro,
    '',
    `Invoice: ${payload.invoiceNumber}`,
    `Invoice date: ${formatDate(payload.invoiceDate)}`,
    `Due date: ${formatDate(payload.dueDate)}`,
    `Status: ${badge.label}`,
    `Amount due: ${formatInr(payload.status === 'PAID' ? 0 : payload.balanceDue)}`,
    `Grand total: ${formatInr(payload.grandTotal)}`,
    payload.amountPaid > 0 ? `Amount paid: ${formatInr(payload.amountPaid)}` : '',
    '',
    'Your invoice PDF is attached to this email for your records.',
    payload.downloadUrl ? `Download: ${payload.downloadUrl}` : '',
    '',
    payload.phone ? `Phone: ${payload.phone}` : '',
    payload.email ? `Email: ${payload.email}` : '',
    `Web: ${payload.website}`,
    '',
    payload.footerNote || 'Thank you for your trust and continued support!',
    '',
    'Mercy Dosa House',
    'Crispy Dosas. Happy Hearts.',
  ].filter((line) => line !== '');

  return { html, text: textLines.join('\n') };
}

export function formatPdfFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'PDF';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
