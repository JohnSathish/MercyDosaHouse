import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';

@Injectable()
export class FcmSender {
  private readonly logger = new Logger(FcmSender.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.readServiceAccount();
  }

  async send(
    tokens: string[],
    message: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId?: string;
      sound?: string | null;
      collapseId?: string;
    },
  ): Promise<string[]> {
    const unique = [...new Set(tokens.filter(Boolean))];
    if (!unique.length) return [];
    const account = this.readServiceAccount();
    if (!account) return [];

    const accessToken = await this.accessToken(account);
    if (!accessToken) return [];

    const invalid: string[] = [];
    const data = Object.fromEntries(
      Object.entries(message.data ?? {}).map(([k, v]) => [k, String(v ?? '')]),
    );

    for (const token of unique) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                data,
                android: {
                  priority: 'HIGH',
                  collapseKey: message.collapseId,
                  notification: {
                    channelId: message.channelId || 'order_updates',
                    sound: message.sound === null ? undefined : message.sound || 'default',
                    notificationCount: 1,
                  },
                },
              },
            }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (res.status === 404 || text.includes('UNREGISTERED') || text.includes('NOT_FOUND')) {
            invalid.push(token);
          } else {
            this.logger.warn(`FCM HTTP ${res.status}`);
          }
        }
      } catch (err) {
        this.logger.warn(`FCM send failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return invalid;
  }

  private readServiceAccount(): {
    project_id: string;
    client_email: string;
    private_key: string;
  } | null {
    const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!raw?.trim()) return null;
    try {
      const parsed = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
      return {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key.replace(/\\n/g, '\n'),
      };
    } catch {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
      return null;
    }
  }

  private async accessToken(account: {
    client_email: string;
    private_key: string;
  }): Promise<string | null> {
    try {
      const jwt = new JWT({
        email: account.client_email,
        key: account.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
      });
      const { access_token } = await jwt.authorize();
      return access_token ?? null;
    } catch (err) {
      this.logger.warn(`FCM auth failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
