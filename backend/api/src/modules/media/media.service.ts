import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { toStoredUploadPath } from '@mdh/utils';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MediaService {
  private uploadDir: string;
  private publicUrl: string;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.uploadDir = config.get('UPLOAD_DIR') || './uploads';
    const publicSiteUrl =
      config.get('NEXT_PUBLIC_WEBSITE_URL') || config.get('SITE_URL') || 'http://localhost:3001';
    this.publicUrl =
      config.get('STORAGE_PUBLIC_URL') || `${String(publicSiteUrl).replace(/\/$/, '')}/uploads`;
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFile(file: Express.Multer.File, uploadedById?: string, altText?: string) {
    const ext = extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const { writeFileSync } = require('fs');
    writeFileSync(join(this.uploadDir, filename), file.buffer);
    const url = toStoredUploadPath(`${this.publicUrl}/${filename}`);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        filename,
        url,
        altText: altText || file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById,
      },
    });

    return { url, filename, id: asset.id };
  }

  list(filters?: { search?: string; folder?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where = {
      ...(filters?.folder ? { folder: filters.folder } : {}),
      ...(filters?.search
        ? {
            OR: [
              { filename: { contains: filters.search, mode: 'insensitive' as const } },
              { altText: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]).then(([data, total]) => ({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }));
  }

  async delete(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Media not found');

    const filePath = join(this.uploadDir, asset.filename);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        /* ignore missing file */
      }
    }

    await this.prisma.mediaAsset.delete({ where: { id } });
    return { deleted: true };
  }

  update(id: string, data: { altText?: string; folder?: string }) {
    return this.prisma.mediaAsset.update({ where: { id }, data });
  }
}
