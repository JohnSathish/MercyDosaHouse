export type CustomerLoginOtpEmailVars = {
  otp: string;
  expiryMinutes: number;
  customerName?: string | null;
  websiteUrl: string;
  year: number;
  logoUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderCustomerLoginOtpEmail(vars: CustomerLoginOtpEmailVars): {
  html: string;
  text: string;
} {
  const otp = vars.otp.replace(/\D/g, '').slice(0, 6);
  const name = vars.customerName?.trim();
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there, 👋';
  const websiteUrl = escapeHtml(vars.websiteUrl);
  const logoUrl = escapeHtml(vars.logoUrl);
  const minutes = String(vars.expiryMinutes);
  const year = String(vars.year);
  const spacedOtp = otp.split('').join('&nbsp;&nbsp;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mercy Dosa House Login OTP</title>
</head>
<body style="margin:0;padding:0;background:#F3E9D7;font-family:Georgia,'Palatino Linotype',Palatino,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3E9D7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFF8E8;border-radius:24px;overflow:hidden;border:1px solid #E8D9C0;">
          <tr>
            <td style="background:#14532D;padding:28px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Mercy Dosa House" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;background:#FFF8E8;padding:6px;border:2px solid #F59E0B;" />
              <p style="margin:0;color:#F59E0B;letter-spacing:3px;font-size:11px;font-weight:700;text-transform:uppercase;">Mercy Dosa House</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;color:#14532D;">
              <p style="margin:0 0 8px;font-size:15px;color:#3F4A3A;">${greeting}</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#14532D;">Welcome Back! 👋</h1>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#3F4A3A;">
                Use the verification code below to securely sign in to your Mercy Dosa House account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 10px;text-align:center;font-size:12px;letter-spacing:2px;font-weight:700;color:#B45309;">YOUR OTP</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#FFFFFF;border:2px solid #F59E0B;border-radius:18px;padding:18px 28px;">
                      <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;letter-spacing:6px;font-weight:800;color:#14532D;">${spacedOtp}</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;text-align:center;font-size:14px;color:#6B7280;">
                This verification code is valid for ${escapeHtml(minutes)} minutes.
              </p>
              <p style="margin:10px 0 0;text-align:center;font-size:14px;color:#14532D;">
                🔒 For your security, please do not share this code with anyone.
              </p>
              <p style="margin:16px 0 0;text-align:center;font-size:13px;color:#6B7280;">
                If you did not request this login code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#B45309;font-size:15px;font-weight:700;">Crispy Dosas. Happy Hearts. ❤️</p>
              <p style="margin:0;color:#14532D;font-size:14px;font-weight:700;">Mercy Dosa House</p>
              <p style="margin:4px 0 0;color:#6B7280;font-size:13px;">Tura, Meghalaya</p>
              <p style="margin:10px 0 0;font-size:13px;">
                <a href="${websiteUrl}" style="color:#14532D;text-decoration:underline;">${websiteUrl}</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;">© ${escapeHtml(year)} Mercy Dosa House</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textGreeting = name ? `Hi ${name},` : 'Hi there,';
  const text = [
    'Mercy Dosa House',
    '',
    textGreeting,
    'Welcome Back!',
    '',
    'Use the verification code below to securely sign in to your Mercy Dosa House account.',
    '',
    `YOUR OTP: ${otp}`,
    '',
    `This verification code is valid for ${minutes} minutes.`,
    'For your security, please do not share this code with anyone.',
    'If you did not request this login code, you can safely ignore this email.',
    '',
    'Crispy Dosas. Happy Hearts.',
    'Mercy Dosa House',
    'Tura, Meghalaya',
    vars.websiteUrl,
  ].join('\n');

  return { html, text };
}
