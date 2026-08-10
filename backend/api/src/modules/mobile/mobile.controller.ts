import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('mobile')
@Controller('mobile')
export class MobileController {
  constructor(private mobileService: MobileService) {}

  @Public()
  @Get('config')
  getConfig() {
    return this.mobileService.getConfig();
  }

  @Public()
  @Get('config/version')
  getConfigVersion() {
    return this.mobileService.getConfigVersion();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get('admin/config')
  getAdminConfig() {
    return this.mobileService.getAdminConfig();
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('admin/config')
  updateAppConfig(@Body() body: Record<string, unknown>) {
    return this.mobileService.updateAppConfig(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('admin/feature-flags')
  updateFeatureFlags(@Body() body: { flags: { key: string; enabled: boolean }[] }) {
    return this.mobileService.updateFeatureFlags(body.flags);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch('admin/home-sections/reorder')
  reorderHomeSections(
    @Body() body: { items: { id: string; sortOrder: number; isEnabled?: boolean }[] },
  ) {
    return this.mobileService.reorderHomeSections(body.items);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('admin/home-sections/publish')
  publishHomeSections() {
    return this.mobileService.publishHomeSections();
  }
}
