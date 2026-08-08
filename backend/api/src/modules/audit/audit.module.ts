import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityGateway } from './activity.gateway';

@Global()
@Module({
  controllers: [ActivityController],
  providers: [AuditService, ActivityService, ActivityGateway],
  exports: [AuditService, ActivityGateway],
})
export class AuditModule {}
