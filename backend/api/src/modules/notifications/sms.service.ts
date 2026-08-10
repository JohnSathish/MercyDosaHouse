import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SmsProvider = 'msg91' | 'twilio' | 'fast2sms' | 'none';

export interface SmsSendResult {
  sent: boolean;
  provider: SmsProvider;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  /** Whether SMS OTP can be delivered in the current environment. */
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
          ? 'SMS verification is not configured. Add SMS provider credentials to enable OTP delivery.'
          : `SMS provider: ${provider}`,
    };
  }

  async sendOtp(phone: string, otp: string): Promise<SmsSendResult> {
    const provider = this.resolveProvider();
    if (provider === 'none') {
      return { sent: false, provider, error: 'SMS provider not configured' };
    }

    const message = `Your Mercy Dosa House verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;

    try {
      switch (provider) {
        case 'msg91':
          await this.sendViaMsg91(phone, message);
          break;
        case 'twilio':
          await this.sendViaTwilio(phone, message);
          break;
        case 'fast2sms':
          await this.sendViaFast2Sms(phone, message);
          break;
      }
      this.logger.log(`OTP SMS dispatched via ${provider} to ${phone.slice(0, 4)}****`);
      return { sent: true, provider };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'SMS delivery failed';
      this.logger.error(`SMS send failed (${provider}): ${error}`);
      return { sent: false, provider, error };
    }
  }

  private resolveProvider(): SmsProvider {
    const explicit = this.config.get<string>('SMS_PROVIDER')?.toLowerCase();
    if (explicit === 'none') return 'none';
    if (explicit === 'msg91' && this.config.get('MSG91_AUTH_KEY')) return 'msg91';
    if (explicit === 'twilio' && this.config.get('TWILIO_ACCOUNT_SID')) return 'twilio';
    if (explicit === 'fast2sms' && this.config.get('FAST2SMS_API_KEY')) return 'fast2sms';
    if (this.config.get('MSG91_AUTH_KEY')) return 'msg91';
    if (this.config.get('TWILIO_ACCOUNT_SID')) return 'twilio';
    if (this.config.get('FAST2SMS_API_KEY')) return 'fast2sms';
    return 'none';
  }

  private async sendViaMsg91(phone: string, message: string) {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY')!;
    const senderId = this.config.get<string>('MSG91_SENDER_ID') || 'MDHOSA';
    const templateId = this.config.get<string>('MSG91_OTP_TEMPLATE_ID');
    const mobile = phone.replace(/\D/g, '').replace(/^91/, '');

    const body: Record<string, unknown> = {
      sender: senderId,
      route: '4',
      country: '91',
      sms: [{ message, to: [`91${mobile}`] }],
    };
    if (templateId) {
      body.DLT_TE_ID = templateId;
    }

    const res = await fetch('https://api.msg91.com/api/v2/sendsms', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`MSG91 HTTP ${res.status}`);
  }

  private async sendViaTwilio(phone: string, message: string) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')!;
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')!;
    const from = this.config.get<string>('TWILIO_FROM_NUMBER')!;
    const to = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    });
    if (!res.ok) throw new Error(`Twilio HTTP ${res.status}`);
  }

  private async sendViaFast2Sms(phone: string, message: string) {
    const apiKey = this.config.get<string>('FAST2SMS_API_KEY')!;
    const mobile = phone.replace(/\D/g, '').replace(/^91/, '');

    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        numbers: mobile,
      }),
    });
    if (!res.ok) throw new Error(`Fast2SMS HTTP ${res.status}`);
  }
}
