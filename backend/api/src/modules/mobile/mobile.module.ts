import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { CmsModule } from '../cms/cms.module';
import { SettingsModule } from '../settings/settings.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [CmsModule, SettingsModule, MarketingModule],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
