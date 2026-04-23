import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseTodoRecordingRequestDto {
  @ApiPropertyOptional({
    description:
      'Optional operator note explaining why this todo recording is being reversed.',
    example: 'Recorded the wrong occurrence date and need to reopen the plan.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string.' })
  @MaxLength(500, {
    message: 'reason must not be longer than 500 characters.',
  })
  reason?: string;
}
