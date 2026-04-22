import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TodoSummaryLatestTodoDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Renew car insurance' })
  name!: string;

  @ApiProperty({ example: '2026-04-21T10:25:00.000Z' })
  createdAt!: Date;
}

export class TodoSummaryResponseDto {
  @ApiProperty({ example: 12 })
  totalCount!: number;

  @ApiProperty({ example: 7 })
  openCount!: number;

  @ApiProperty({ example: 3 })
  completedCount!: number;

  @ApiProperty({ example: 5 })
  recurringCount!: number;

  @ApiProperty({ example: 4 })
  topPriorityCount!: number;

  @ApiProperty({ example: 6 })
  withImagesCount!: number;

  @ApiProperty({ example: 25 })
  completionPercentage!: number;

  @ApiProperty({ example: 50 })
  imageCoveragePercentage!: number;

  @ApiProperty({ example: 850000 })
  plannedTotal!: number;

  @ApiProperty({ example: 540000 })
  openPlannedTotal!: number;

  @ApiProperty({ example: 120000 })
  remainingRecurringBudgetTotal!: number;

  @ApiProperty({ example: 6 })
  recordedCount!: number;

  @ApiProperty({ example: 310000 })
  recordedTotalAmount!: number;

  @ApiProperty({ example: 2 })
  overdueCount!: number;

  @ApiProperty({ example: 45000 })
  next7DaysScheduledAmount!: number;

  @ApiProperty({ example: 125000 })
  next30DaysScheduledAmount!: number;

  @ApiPropertyOptional({
    type: TodoSummaryLatestTodoDto,
    nullable: true,
  })
  latestTodo!: TodoSummaryLatestTodoDto | null;
}
