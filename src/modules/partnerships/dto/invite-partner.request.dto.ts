import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InvitePartnerRequestDto {
  @ApiProperty({ example: 'alice.mutoni@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
