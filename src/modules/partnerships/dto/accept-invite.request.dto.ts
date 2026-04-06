import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class AcceptInviteRequestDto {
  @ApiProperty({ description: 'Raw invitation token from the email link.' })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  token!: string;
}
