import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { randomInt } from 'node:crypto';
import sharp from 'sharp';

import { cloudinaryConfig } from '../../../config/cloudinary.config';

export const TODO_IMAGE_DIMENSION = 1600;
export const MAX_TODO_IMAGES = 6;
export const MAX_TODO_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TODO_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface TodoUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredTodoImage {
  publicId: string;
  imageUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

@Injectable()
export class TodoImageStorageService {
  constructor(
    @Inject(cloudinaryConfig.KEY)
    private readonly cloudinarySettings: ConfigType<typeof cloudinaryConfig>,
  ) {
    if (this.isConfigured()) {
      cloudinary.config({
        cloud_name: this.cloudinarySettings.cloudName,
        api_key: this.cloudinarySettings.apiKey,
        api_secret: this.cloudinarySettings.apiSecret,
        secure: true,
      });
    }
  }

  ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Todo image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before uploading todo images.',
      );
    }
  }

  async uploadTodoImage(params: {
    todoId: string;
    todoName: string;
    file: TodoUploadFile;
    uploadedAt?: Date;
  }): Promise<StoredTodoImage> {
    this.ensureConfigured();
    this.assertValidUpload(params.file);

    const processedImage = await sharp(params.file.buffer)
      .rotate()
      .resize(TODO_IMAGE_DIMENSION, TODO_IMAGE_DIMENSION, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({
        quality: 92,
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

    const uploadDate = params.uploadedAt ?? new Date();
    const publicId = this.buildPublicId(params.todoName, uploadDate);
    const folder = `${this.cloudinarySettings.todoFolder}/${params.todoId}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder,
          public_id: publicId,
          format: 'jpg',
          overwrite: false,
          unique_filename: false,
        },
        (error, response) => {
          if (error) {
            const uploadErrorMessage =
              typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof error.message === 'string'
                ? error.message
                : 'Cloudinary upload failed.';

            reject(new Error(uploadErrorMessage));
            return;
          }

          if (!response) {
            reject(new Error('Cloudinary upload returned no response.'));
            return;
          }

          resolve(response);
        },
      );

      stream.end(processedImage.data);
    });

    return {
      publicId: result.public_id,
      imageUrl: result.secure_url,
      width: result.width ?? processedImage.info.width,
      height: result.height ?? processedImage.info.height,
      bytes: result.bytes ?? processedImage.data.length,
      format: result.format ?? 'jpg',
    };
  }

  async cleanupUploadedImages(publicIds: string[]): Promise<void> {
    if (!this.isConfigured() || publicIds.length === 0) {
      return;
    }

    await Promise.allSettled(
      publicIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
          invalidate: false,
        }),
      ),
    );
  }

  private isConfigured(): boolean {
    return Boolean(
      this.cloudinarySettings.cloudName &&
      this.cloudinarySettings.apiKey &&
      this.cloudinarySettings.apiSecret,
    );
  }

  private assertValidUpload(file: TodoUploadFile): void {
    if (!ALLOWED_TODO_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP todo images are supported.',
      );
    }

    if (file.size > MAX_TODO_IMAGE_SIZE_BYTES) {
      throw new BadRequestException(
        `Each todo image must be ${Math.floor(MAX_TODO_IMAGE_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
      );
    }

    if (file.buffer.length === 0) {
      throw new BadRequestException('Uploaded todo images must not be empty.');
    }
  }

  private buildPublicId(todoName: string, uploadedAt: Date): string {
    const slug = this.slugify(todoName);
    const timestamp = uploadedAt
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .toLowerCase();
    const uniqueNumber = randomInt(100000, 999999);

    return `${slug}-${timestamp}-${uniqueNumber}`;
  }

  private slugify(value: string): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized.length > 0 ? normalized.slice(0, 60) : 'todo-image';
  }
}
