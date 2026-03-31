import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

import { cloudinaryConfig } from '../../../config/cloudinary.config';

export const PROFILE_AVATAR_DIMENSION = 960;
export const MAX_PROFILE_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROFILE_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface AvatarUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredUserAvatar {
  imageUrl: string;
}

@Injectable()
export class AvatarImageStorageService {
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
        'Profile image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before uploading avatars.',
      );
    }
  }

  async uploadAvatar(params: {
    userId: string;
    displayName: string;
    file: AvatarUploadFile;
  }): Promise<StoredUserAvatar> {
    this.ensureConfigured();
    this.assertValidUpload(params.file);

    const processedImage = await sharp(params.file.buffer)
      .rotate()
      .resize(PROFILE_AVATAR_DIMENSION, PROFILE_AVATAR_DIMENSION, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({
        quality: 92,
        mozjpeg: true,
      })
      .toBuffer();

    const folder = `${this.cloudinarySettings.avatarFolder}/${params.userId}`;
    const publicId = this.buildPublicId(params.displayName);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder,
          public_id: publicId,
          format: 'jpg',
          overwrite: true,
          unique_filename: false,
          invalidate: true,
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

      stream.end(processedImage);
    });

    return {
      imageUrl: result.secure_url,
    };
  }

  private isConfigured(): boolean {
    return Boolean(
      this.cloudinarySettings.cloudName &&
      this.cloudinarySettings.apiKey &&
      this.cloudinarySettings.apiSecret,
    );
  }

  private assertValidUpload(file: AvatarUploadFile): void {
    if (!ALLOWED_PROFILE_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP profile images are supported.',
      );
    }

    if (file.size > MAX_PROFILE_AVATAR_SIZE_BYTES) {
      throw new BadRequestException(
        `Each profile image must be ${Math.floor(MAX_PROFILE_AVATAR_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
      );
    }

    if (file.buffer.length === 0) {
      throw new BadRequestException(
        'Uploaded profile image must not be empty.',
      );
    }
  }

  private buildPublicId(displayName: string): string {
    const slug = displayName
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug.length > 0 ? `${slug}-avatar` : 'profile-avatar';
  }
}
