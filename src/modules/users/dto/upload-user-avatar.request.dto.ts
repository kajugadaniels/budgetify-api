import { ApiProperty } from '@nestjs/swagger';

export class UploadUserAvatarRequestDto {
  @ApiProperty({
    description: 'JPEG, PNG, or WebP avatar image for the authenticated user.',
    type: 'string',
    format: 'binary',
  })
  avatar!: unknown;
}
