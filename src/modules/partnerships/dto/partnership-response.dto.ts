import { ApiProperty } from '@nestjs/swagger';
import { PartnershipStatus } from '@prisma/client';

export class PartnerUserDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Alice', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Mutoni', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: 'Alice Mutoni', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: 'alice.mutoni@example.com' })
  email!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/avatar.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}

export class PartnershipResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ enum: PartnershipStatus, example: PartnershipStatus.ACCEPTED })
  status!: PartnershipStatus;

  @ApiProperty({ example: 'alice.mutoni@example.com' })
  inviteeEmail!: string;

  @ApiProperty({
    description: 'Whether the current user is the one who sent the invitation.',
  })
  isOwner!: boolean;

  @ApiProperty({ type: PartnerUserDto })
  owner!: PartnerUserDto;

  @ApiProperty({ type: PartnerUserDto, nullable: true })
  partner!: PartnerUserDto | null;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}
