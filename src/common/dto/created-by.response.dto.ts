import { ApiProperty } from '@nestjs/swagger';

export class CreatedByResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Alice', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Mutoni', nullable: true })
  lastName!: string | null;

  @ApiProperty({
    example: 'https://res.cloudinary.com/example/avatar.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}
