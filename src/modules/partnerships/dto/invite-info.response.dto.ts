import { ApiProperty } from '@nestjs/swagger';

export class InviteInfoResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  partnershipId!: string;

  @ApiProperty({ example: 'alice.mutoni@example.com' })
  inviteeEmail!: string;

  @ApiProperty({ example: 'Alice', nullable: true })
  ownerFirstName!: string | null;

  @ApiProperty({ example: 'Mutoni', nullable: true })
  ownerLastName!: string | null;

  @ApiProperty({ example: 'Alice Mutoni', nullable: true })
  ownerFullName!: string | null;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/avatar.jpg',
    nullable: true,
  })
  ownerAvatarUrl!: string | null;

  @ApiProperty()
  expiresAt!: Date;
}
