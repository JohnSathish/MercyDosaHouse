import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { renderCustomerLoginOtpEmail } from './customer-login-otp-email.template';
import { formatFromHeader, sanitizeEmailError } from './email-branding';

export type EmailProvider = 'smtp' | 'resend' | 'none';

export interface EmailSendResult {
  sent: boolean;
  provider: EmailProvider;
  error?: string;
}

export interface EmailConfigStatus {
  configured: boolean;
  provider: EmailProvider;
  message: string;
  missing?: string[];
  fromDisplay?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

const DEFAULT_FROM_EMAIL = 'info@mercydosahouse.com';
const DEFAULT_FROM_NAME = 'Mercy Dosa House';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const status = this.getConfigStatus();
    if (!status.configured) {
      this.logger.warn(
        `Order notification emails DISABLED: ${status.message}${
          status.missing?.length ? ` (missing: ${status.missing.join(', ')})` : ''
        }`,
      );
    } else {
      this.logger.log(`Order notification emails enabled via ${status.provider}`);
    }
  }

  isConfigured(): boolean {
    return this.resolveProvider() !== 'none';
  }

  getStatus() {
    const status = this.getConfigStatus();
    return {
      configured: status.configured,
      provider: status.provider,
      message: status.message,
      missing: status.missing,
      fromDisplay: this.getFromAddress(),
    };
  }

  getConfigStatus(): EmailConfigStatus {
    const provider = this.resolveProvider();
    if (provider === 'none') {
      const explicit = this.config.get<string>('EMAIL_PROVIDER')?.toLowerCase();
      const missing: string[] = [];
      if (explicit === 'resend' && !this.config.get('RESEND_API_KEY')) {
        missing.push('RESEND_API_KEY');
      }
      if ((explicit === 'smtp' || !explicit) && !this.config.get('SMTP_HOST')) {
        missing.push('SMTP_HOST');
      }
      if (this.config.get('SMTP_HOST')) {
        if (!this.config.get('SMTP_USER')) missing.push('SMTP_USER');
        if (!this.config.get('SMTP_PASS')) missing.push('SMTP_PASS');
      }
      return {
        configured: false,
        provider: 'none',
        message:
          missing.length > 0
            ? 'Email provider credentials are incomplete'
            : 'Email provider not configured',
        missing: missing.length ? missing : undefined,
        fromDisplay: this.getFromAddress(),
      };
    }
    return {
      configured: true,
      provider,
      message: `Email provider: ${provider}`,
      fromDisplay: this.getFromAddress(),
    };
  }

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const provider = this.resolveProvider();
    if (provider === 'none') {
      return { sent: false, provider, error: 'Email provider not configured' };
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    try {
      if (provider === 'resend') {
        await this.sendViaResend({ ...options, to: recipients });
      } else {
        await this.sendViaSmtp({ ...options, to: recipients });
      }
      this.logger.log(`Email sent via ${provider} to ${recipients.length} recipient(s)`);
      return { sent: true, provider };
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Email delivery failed';
      const error = sanitizeEmailError(raw, [
        this.config.get('SMTP_PASS'),
        this.config.get('RESEND_API_KEY'),
        this.config.get('SMTP_RELAY_TOKEN'),
      ]);
      this.logger.error(`Email send failed (${provider}): ${error}`);
      return { sent: false, provider, error };
    }
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

  getFromAddress(senderName?: string, senderEmail?: string): string {
    if (senderName && senderEmail) {
      return formatFromHeader(senderName, senderEmail);
    }
    return (
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      formatFromHeader(DEFAULT_FROM_NAME, DEFAULT_FROM_EMAIL)
    );
  }

  private async sendViaResend(options: SendEmailOptions & { to: string[] }) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')!;
    const from = options.from || this.getFromAddress();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        reply_to: options.replyTo,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
        })),
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend HTTP ${res.status}`);
    }
  }

  private async sendViaSmtp(options: SendEmailOptions & { to: string[] }) {
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
          from: options.from || this.getFromAddress(),
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments?.map((a) => ({
            filename: a.filename,
            content: a.content.toString('base64'),
            contentType: a.contentType,
          })),
        }),
      });
      if (!res.ok) throw new Error(`SMTP relay HTTP ${res.status}`);
      return;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get('SMTP_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS are required');
    }

    const secureExplicit = this.config.get<string>('SMTP_SECURE');
    const secure = secureExplicit != null ? secureExplicit === 'true' : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: this.config.get('SMTP_TLS_REJECT_UNAUTHORIZED') !== 'false',
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
    });

    await transporter.sendMail({
      from: options.from || this.getFromAddress(),
      to: options.to.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }

  sendCustomerLoginOtp(options: {
    to: string;
    otp: string;
    expiryMinutes: number;
    customerName?: string | null;
    websiteUrl: string;
    logoUrl: string;
    senderName?: string;
    senderEmail?: string;
  }) {
    const { html, text } = renderCustomerLoginOtpEmail({
      otp: options.otp,
      expiryMinutes: options.expiryMinutes,
      customerName: options.customerName,
      websiteUrl: options.websiteUrl,
      year: new Date().getFullYear(),
      logoUrl: options.logoUrl,
    });
    return this.send({
      to: options.to,
      from: this.getFromAddress(options.senderName, options.senderEmail),
      subject: 'Your Mercy Dosa House Login OTP 🔐',
      text,
      html,
    });
  }
}
