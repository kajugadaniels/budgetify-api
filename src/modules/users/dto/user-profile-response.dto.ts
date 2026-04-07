import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserProfileResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: 'Jane Doe', nullable: true })
  fullName!: string | null;

  @ApiProperty({
    example: 'https://lh3.googleusercontent.com/a/example',
    nullable: true,
  })
  avatarUrl!: string | null;

  @ApiProperty({ example: true })
  isEmailVerified!: boolean;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ example: '2026-03-06T10:00:00.000Z', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({
    example: '2026-04-07T09:00:00.000Z',
    nullable: true,
    description:
      'When the user requested account deletion. Null when no deletion is pending.',
  })
  accountDeletionRequestedAt!: Date | null;

  @ApiProperty({
    example: '2026-05-07T09:00:00.000Z',
    nullable: true,
    description:
      'When the account is scheduled to be deleted if no further activity happens.',
  })
  accountDeletionScheduledFor!: Date | null;

  @ApiProperty({ example: '2026-03-06T09:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-06T10:00:00.000Z' })
  updatedAt!: Date;
}
