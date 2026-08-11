import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [NotificationsModule, SettingsModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
