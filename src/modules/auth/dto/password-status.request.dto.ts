import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordStatusRequestDto {
  @ApiProperty({ example: 'alice.mutoni@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;
}
