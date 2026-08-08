import { Injectable, Optional } from '@nestjs/common';
import { ActivitySeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityGateway } from './activity.gateway';

export interface ActivityLogParams {
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  description?: string;
  severity?: ActivitySeverity;
  status?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  location?: string;
  sessionId?: string;
  durationMs?: number;
  detail?: {
    requestUrl?: string;
    apiEndpoint?: string;
    relatedRecord?: string;
    macAddress?: string;
    os?: string;
    extra?: Record<string, unknown>;
  };
}

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    @Optional() private gateway?: ActivityGateway,
  ) {}

  async log(params: ActivityLogParams) {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        description: params.description,
        severity: params.severity ?? ActivitySeverity.INFO,
        status: params.status ?? 'SUCCESS',
        oldValue: params.oldValue as Prisma.InputJsonValue,
        newValue: params.newValue as Prisma.InputJsonValue,
        metadata: params.metadata as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        device: params.device,
        browser: params.browser,
        location: params.location,
        sessionId: params.sessionId,
        durationMs: params.durationMs,
        detail: params.detail
          ? {
              create: {
                requestUrl: params.detail.requestUrl,
                apiEndpoint: params.detail.apiEndpoint,
                relatedRecord: params.detail.relatedRecord,
                macAddress: params.detail.macAddress,
                os: params.detail.os,
                extra: params.detail.extra as Prisma.InputJsonValue,
              },
            }
          : undefined,
      },
      include: { detail: true },
    });

    this.gateway?.emitActivity(this.mapLog(log));
    return log;
  }

  mapLog(log: Prisma.AuditLogGetPayload<{ include: { detail: true } }>) {
    return {
      id: log.id,
      userId: log.userId,
      userName: log.userName,
      userRole: log.userRole,
      action: log.action,
      module: log.entity,
      entityId: log.entityId,
      description: log.description,
      severity: log.severity,
      status: log.status,
      oldValue: log.oldValue,
      newValue: log.newValue,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      device: log.device,
      browser: log.browser,
      location: log.location,
      sessionId: log.sessionId,
      durationMs: log.durationMs,
      createdAt: log.createdAt.toISOString(),
      detail: log.detail,
    };
  }
}
