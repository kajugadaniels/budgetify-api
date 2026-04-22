import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateTodoRecordingRequestDto {
  @ApiProperty({
    description:
      'Expense already created from this todo. The recording will derive payment metadata and charged amounts from it.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
  })
  @IsUUID('4', { message: 'expenseId must be a valid UUID.' })
  expenseId!: string;

  @ApiProperty({
    description:
      'Occurrence date being marked as recorded. For one-time todos, this is the recorded expense date.',
    example: '2026-04-22',
  })
  @IsDateString(
    {},
    {
      message: 'occurrenceDate must be a valid ISO date string (YYYY-MM-DD).',
    },
  )
  occurrenceDate!: string;
}
