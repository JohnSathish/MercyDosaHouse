import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { contactFormSchema, CONTACT_FORM_SUBJECTS } from '@mdh/types';
import { EmailService } from '../notifications/email.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ContactService {
  constructor(
    private emailService: EmailService,
    private settingsService: SettingsService,
    private config: ConfigService,
  ) {}

  getSubjects() {
    return CONTACT_FORM_SUBJECTS;
  }

  async submitMessage(
    raw: Record<string, unknown>,
    image?: Express.Multer.File,
  ): Promise<{ sent: boolean; error?: string }> {
    const parsed = contactFormSchema.safeParse({
      name: raw.name,
      phone: raw.phone,
      email: raw.email,
      subject: raw.subject,
      message: raw.message,
    });

    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(', ');
      throw new BadRequestException(msg);
    }

    const data = parsed.data;
    const settings = await this.settingsService.getBusinessSettings();
    const recipients = [
      settings.email?.trim(),
      ...(this.config.get<string>('ORDER_NOTIFICATION_RECIPIENTS') || '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
    ].filter(Boolean) as string[];

    const to = [...new Set(recipients.length ? recipients : ['info@mercydosahouse.com'])];

    if (!this.emailService.isConfigured()) {
      return {
        sent: false,
        error: 'Message could not be sent right now. Please call us or use WhatsApp.',
      };
    }

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F2937">
        <h2 style="color:#14532D;margin:0 0 12px">New contact form message</h2>
        <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap;background:#FFF8E8;padding:12px;border-radius:8px">${escapeHtml(data.message)}</p>
      </div>
    `;

    const text = [
      'New contact form message',
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email}`,
      `Subject: ${data.subject}`,
      '',
      data.message,
    ].join('\n');

    const attachments = image
      ? [
          {
            filename: image.originalname || 'attachment.jpg',
            content: image.buffer,
            contentType: image.mimetype,
          },
        ]
      : undefined;

    const result = await this.emailService.send({
      to,
      subject: `Contact: ${data.subject} — ${data.name}`,
      html,
      text,
      replyTo: data.email,
      attachments,
    });

    return result.sent
      ? { sent: true }
      : { sent: false, error: result.error ?? 'Failed to send message' };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
