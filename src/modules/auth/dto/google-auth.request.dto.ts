import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthRequestDto {
  @ApiProperty({
    description:
      'Google-issued ID token obtained from Google Sign-In on the client.',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjQ2Nz...google-id-token-example...',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
