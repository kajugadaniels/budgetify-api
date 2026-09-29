import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Password saved. You can now sign in.' })
  message!: string;
}
