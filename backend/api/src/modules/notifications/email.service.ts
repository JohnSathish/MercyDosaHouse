import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmailProvider = 'smtp' | 'resend' | 'none';

export interface EmailSendResult {
  sent: boolean;
  provider: EmailProvider;
  error?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return this.resolveProvider() !== 'none';
  }

  getStatus() {
    const provider = this.resolveProvider();
    return {
      configured: provider !== 'none',
      provider,
      message:
        provider === 'none'
          ? 'Email notifications are not configured. Add SMTP or Resend credentials to enable email delivery.'
          : `Email provider: ${provider}`,
    };
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const provider = this.resolveProvider();
    if (provider === 'none') {
      return { sent: false, provider, error: 'Email provider not configured' };
    }

    try {
      if (provider === 'resend') {
        await this.sendViaResend(options);
      } else {
        await this.sendViaSmtp(options);
      }
      this.logger.log(`Email sent via ${provider} to ${options.to}`);
      return { sent: true, provider };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Email delivery failed';
      this.logger.error(`Email send failed (${provider}): ${error}`);
      return { sent: false, provider, error };
    }
  }

  async sendOrderConfirmation(to: string, orderNumber: string, total: number) {
    return this.send({
      to,
      subject: `Order Confirmed — ${orderNumber} | Mercy Dosa House`,
      text: `Thank you for your order #${orderNumber}. Total: ₹${total}. We are preparing your food with care.`,
      html: `<p>Thank you for your order <strong>#${orderNumber}</strong>.</p><p>Total: <strong>₹${total}</strong></p><p>We are preparing your food with care.</p>`,
    });
  }

  private resolveProvider(): EmailProvider {
    const explicit = this.config.get<string>('EMAIL_PROVIDER')?.toLowerCase();
    if (explicit === 'none') return 'none';
    if (explicit === 'resend' && this.config.get('RESEND_API_KEY')) return 'resend';
    if (explicit === 'smtp' && this.config.get('SMTP_HOST')) return 'smtp';
    if (this.config.get('RESEND_API_KEY')) return 'resend';
    if (this.config.get('SMTP_HOST')) return 'smtp';
    return 'none';
  }

  private async sendViaResend(options: SendEmailOptions) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')!;
    const from =
      this.config.get<string>('EMAIL_FROM') || 'Mercy Dosa House <orders@mercydosahouse.com>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend HTTP ${res.status}: ${body}`);
    }
  }

  /** SMTP via raw HTTP relay or future nodemailer integration — uses a simple fetch-based relay if SMTP_RELAY_URL is set. */
  private async sendViaSmtp(options: SendEmailOptions) {
    const relayUrl = this.config.get<string>('SMTP_RELAY_URL');
    if (relayUrl) {
      const res = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.get('SMTP_RELAY_TOKEN') || ''}`,
        },
        body: JSON.stringify({
          host: this.config.get('SMTP_HOST'),
          port: Number(this.config.get('SMTP_PORT') || 587),
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
          from: this.config.get('EMAIL_FROM'),
          ...options,
        }),
      });
      if (!res.ok) throw new Error(`SMTP relay HTTP ${res.status}`);
      return;
    }

    // Direct SMTP credentials stored for when nodemailer is added — log intent without blocking
    this.logger.warn(
      `SMTP configured (${this.config.get('SMTP_HOST')}) but no relay. Install nodemailer or set SMTP_RELAY_URL. Email to ${options.to} queued in logs only.`,
    );
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
    }
    throw new Error('SMTP relay not configured. Set SMTP_RELAY_URL or add nodemailer.');
  }
}
