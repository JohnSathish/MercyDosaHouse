import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private uploadDir: string;
  private publicUrl: string;

  constructor(config: ConfigService) {
    this.uploadDir = config.get('UPLOAD_DIR') || './uploads';
    this.publicUrl = config.get('STORAGE_PUBLIC_URL') || 'http://localhost:3001/uploads';
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  saveFile(file: Express.Multer.File): { url: string; filename: string } {
    const ext = extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const { writeFileSync } = require('fs');
    writeFileSync(join(this.uploadDir, filename), file.buffer);
    return {
      url: `${this.publicUrl}/${filename}`,
      filename,
    };
  }
}
