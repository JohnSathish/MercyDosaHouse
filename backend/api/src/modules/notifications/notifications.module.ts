import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { OrderEmailNotificationService } from './order-email-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsService, EmailService, OrderEmailNotificationService],
  exports: [NotificationsService, SmsService, EmailService, OrderEmailNotificationService],
})
export class NotificationsModule {}
