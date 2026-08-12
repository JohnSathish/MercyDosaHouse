import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class OrderNotificationRecipientsService {
  private cachedActive: string[] | null = null;
  private cacheExpiresAt = 0;
  private readonly cacheTtlMs = 5_000;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  assertValidEmail(email: string): void {
    if (!email) throw new BadRequestException('Email address is required');
    if (!EMAIL_REGEX.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }
  }

  invalidateCache(): void {
    this.cachedActive = null;
    this.cacheExpiresAt = 0;
  }

  private map(row: {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      email: row.email,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** One-time import from env when table is empty (migration aid only). */
  async ensureSeededFromEnv(): Promise<void> {
    await this.migrateLegacyRecipientEmails();

    const count = await this.prisma.orderNotificationRecipient.count();
    if (count > 0) {
      await this.ensureEmailPresent('nambikaimary96@gmail.com');
      return;
    }

    const raw = this.config.get<string>('ORDER_NOTIFICATION_RECIPIENTS') ?? '';
    const emails = [
      ...new Set(
        raw
          .split(',')
          .map((e) => this.normalizeEmail(e))
          .filter(Boolean),
      ),
    ];
    if (!emails.includes('nambikaimary96@gmail.com')) {
      emails.push('nambikaimary96@gmail.com');
    }
    if (!emails.length) return;

    await this.prisma.orderNotificationRecipient.createMany({
      data: emails.map((email) => ({ email, isActive: true })),
      skipDuplicates: true,
    });
    this.invalidateCache();
  }

  /** Replace known legacy addresses and keep the restaurant owner inbox active. */
  private async migrateLegacyRecipientEmails(): Promise<void> {
    const legacy = await this.prisma.orderNotificationRecipient.findFirst({
      where: { email: { equals: 'sudhabca96@gmail.com', mode: 'insensitive' } },
    });
    if (!legacy) return;

    const target = await this.prisma.orderNotificationRecipient.findFirst({
      where: { email: { equals: 'nambikaimary96@gmail.com', mode: 'insensitive' } },
    });

    if (target) {
      await this.prisma.orderNotificationRecipient.delete({ where: { id: legacy.id } });
    } else {
      await this.prisma.orderNotificationRecipient.update({
        where: { id: legacy.id },
        data: { email: 'nambikaimary96@gmail.com', isActive: true },
      });
    }
    this.invalidateCache();
  }

  private async ensureEmailPresent(emailRaw: string): Promise<void> {
    const email = this.normalizeEmail(emailRaw);
    const existing = await this.prisma.orderNotificationRecipient.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      if (!existing.isActive) {
        await this.prisma.orderNotificationRecipient.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        this.invalidateCache();
      }
      return;
    }
    await this.prisma.orderNotificationRecipient.create({
      data: { email, isActive: true },
    });
    this.invalidateCache();
  }

  async listAll() {
    await this.ensureSeededFromEnv();
    const rows = await this.prisma.orderNotificationRecipient.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => this.map(row));
  }

  async getActiveRecipientEmails(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedActive && now < this.cacheExpiresAt) {
      return this.cachedActive;
    }

    await this.ensureSeededFromEnv();
    const rows = await this.prisma.orderNotificationRecipient.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { email: true },
    });

    this.cachedActive = rows.map((r) => r.email);
    this.cacheExpiresAt = now + this.cacheTtlMs;
    return [...this.cachedActive];
  }

  async create(emailRaw: string, createdById?: string) {
    const email = this.normalizeEmail(emailRaw);
    this.assertValidEmail(email);

    const existing = await this.prisma.orderNotificationRecipient.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('This email address is already configured');
    }

    const row = await this.prisma.orderNotificationRecipient.create({
      data: { email, isActive: true, createdById },
    });
    this.invalidateCache();
    return this.map(row);
  }

  async update(id: string, data: { email?: string; isActive?: boolean }) {
    const current = await this.prisma.orderNotificationRecipient.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Notification email not found');

    const patch: { email?: string; isActive?: boolean } = {};
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    if (data.email !== undefined) {
      const email = this.normalizeEmail(data.email);
      this.assertValidEmail(email);
      if (email !== current.email) {
        const duplicate = await this.prisma.orderNotificationRecipient.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            NOT: { id },
          },
        });
        if (duplicate) {
          throw new ConflictException('This email address is already configured');
        }
      }
      patch.email = email;
    }

    const row = await this.prisma.orderNotificationRecipient.update({
      where: { id },
      data: patch,
    });
    this.invalidateCache();
    return this.map(row);
  }

  async remove(id: string): Promise<void> {
    const current = await this.prisma.orderNotificationRecipient.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Notification email not found');
    await this.prisma.orderNotificationRecipient.delete({ where: { id } });
    this.invalidateCache();
  }
}
