import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export enum ShortcutImportCredentialStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export class CreateShortcutImportCredentialDto {
  @ApiProperty({
    example: "Daniels' iPhone",
    description: 'A recognizable name for the iPhone running the Shortcut.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  deviceName!: string;
}

export class ShortcutImportCredentialResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: "Daniels' iPhone" })
  deviceName!: string;

  @ApiProperty({ example: 'bfi_35c8e0a90d692fd1' })
  tokenPrefix!: string;

  @ApiProperty({ enum: ShortcutImportCredentialStatus })
  status!: ShortcutImportCredentialStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class CreatedShortcutImportCredentialResponseDto extends ShortcutImportCredentialResponseDto {
  @ApiProperty({
    description:
      'One-time iPhone Shortcut token. Store it in the Shortcut immediately; the API cannot display it again.',
    example: 'bfi_35c8e0a90d692fd1_example-one-time-secret',
  })
  token!: string;
}
