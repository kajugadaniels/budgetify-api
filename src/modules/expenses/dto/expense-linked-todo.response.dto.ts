import { ApiProperty } from '@nestjs/swagger';

export class ExpenseLinkedTodoResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  todoId!: string;

  @ApiProperty({ example: 'Buy school supplies' })
  todoName!: string;

  @ApiProperty({ example: 'c0f67b39-68cb-4727-a0b0-1dd1841a9f9e' })
  recordingId!: string;

  @ApiProperty({ example: '2026-04-22' })
  occurrenceDate!: string;
}
