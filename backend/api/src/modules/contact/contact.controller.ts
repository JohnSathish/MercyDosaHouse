import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../../common/guards';
import { ContactService } from './contact.service';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Public()
  @Get('subjects')
  getSubjects() {
    return { subjects: this.contactService.getSubjects() };
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only JPG or PNG images up to 5MB are allowed') as never,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  submit(@Body() body: Record<string, unknown>, @UploadedFile() image?: Express.Multer.File) {
    return this.contactService.submitMessage(body, image);
  }
}
