import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TodoOccurrenceStatus } from '@prisma/client';

export class TodoOccurrenceResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({
    example: '2026-04-24',
    description: 'Occurrence date in YYYY-MM-DD format.',
  })
  occurrenceDate!: string;

  @ApiProperty({
    enum: TodoOccurrenceStatus,
    example: TodoOccurrenceStatus.SCHEDULED,
    description:
      'Resolved schedule state for this occurrence. Overdue is derived automatically when a scheduled occurrence has passed.',
  })
  status!: TodoOccurrenceStatus;

  @ApiPropertyOptional({
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
    nullable: true,
  })
  recordingId!: string | null;

  @ApiPropertyOptional({
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
    nullable: true,
  })
  expenseId!: string | null;
}
