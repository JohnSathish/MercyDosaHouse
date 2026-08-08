import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { Public, RequirePermissions } from '../../common/guards';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Public()
  @Get()
  findAll(@Query('active') active?: string) {
    return this.offersService.findAll(active === 'true');
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.offersService.create(body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.offersService.update(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.offersService.delete(id);
  }
}
