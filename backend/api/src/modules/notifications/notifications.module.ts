import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { OrderEmailNotificationService } from './order-email-notification.service';
import { OrderNotificationRecipientsService } from './order-notification-recipients.service';
import { FcmSender } from './fcm.sender';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FcmSender,
    SmsService,
    EmailService,
    OrderEmailNotificationService,
    OrderNotificationRecipientsService,
  ],
  exports: [
    NotificationsService,
    SmsService,
    EmailService,
    OrderEmailNotificationService,
    OrderNotificationRecipientsService,
  ],
})
export class NotificationsModule {}
