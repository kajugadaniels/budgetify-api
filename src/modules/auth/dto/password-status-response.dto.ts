import { ApiProperty } from '@nestjs/swagger';

export class PasswordStatusResponseDto {
  @ApiProperty({
    description:
      'True when the email can continue with password authentication.',
    example: true,
  })
  hasPassword!: boolean;
}
