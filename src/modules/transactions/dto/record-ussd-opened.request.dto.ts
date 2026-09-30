import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

function normalizeClientEventId(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

export class RecordUssdOpenedRequestDto {
  @ApiProperty({
    description:
      'Client-generated unique identifier used to safely retry the same USSD-opened event.',
    example: 'ussd-1759246800000-a4d92b87919d4c41',
    minLength: 16,
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeClientEventId(value))
  @IsString()
  @MinLength(16)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._:-]+$/, {
    message:
      'Client event ID may only contain letters, numbers, dots, underscores, colons, and hyphens.',
  })
  clientEventId!: string;
}
