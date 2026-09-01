import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { MediaService } from './media.service';
import { RequirePermissions, Public } from '../../common/guards';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Public()
  @Get('file/:filename')
  servePublicFile(@Param('filename') filename: string, @Res() res: Response) {
    const file = this.mediaService.resolvePublicFile(filename);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.sendFile(file.path);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/', 'video/', 'image/svg+xml', 'application/pdf'];
        if (!allowed.some((t) => file.mimetype.startsWith(t) || file.mimetype === t)) {
          return cb(new BadRequestException('Unsupported file type') as never, false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: { user?: { id: string } }) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.mediaService.saveFile(file, req.user?.id);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.read')
  @Get()
  list(
    @Query('search') search?: string,
    @Query('folder') folder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mediaService.list({
      search,
      folder,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { altText?: string; folder?: string }) {
    return this.mediaService.update(id, body);
  }

  @ApiBearerAuth()
  @RequirePermissions('cms.write')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }
}
