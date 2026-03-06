import { ApiProperty } from '@nestjs/swagger';

import { UserProfileResponseDto } from '../../users/dto/user-profile-response.dto';

export class AuthResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token-example.signature',
  })
  accessToken!: string;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-example.signature',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access token lifetime in seconds.',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ type: () => UserProfileResponseDto })
  user!: UserProfileResponseDto;
}
