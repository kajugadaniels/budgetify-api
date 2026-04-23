import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TodoFrequency, TodoType } from '@prisma/client';

export class TodoSummaryLatestTodoDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Renew car insurance' })
  name!: string;

  @ApiProperty({ example: '2026-04-21T10:25:00.000Z' })
  createdAt!: Date;
}

export class TodoFrequencyCompletionDto {
  @ApiProperty({ enum: TodoFrequency, example: TodoFrequency.MONTHLY })
  frequency!: TodoFrequency;

  @ApiProperty({ example: 8 })
  totalCount!: number;

  @ApiProperty({ example: 3 })
  completedCount!: number;

  @ApiProperty({ example: 38 })
  completionPercentage!: number;
}

export class TodoRecurringBudgetBurnDownDto {
  @ApiProperty({ example: 420000 })
  targetAmount!: number;

  @ApiProperty({ example: 185000 })
  usedAmount!: number;

  @ApiProperty({ example: 235000 })
  remainingAmount!: number;

  @ApiProperty({ example: 44 })
  usagePercentage!: number;
}

export class TodoTypeBreakdownDto {
  @ApiProperty({ enum: TodoType, example: TodoType.WISHLIST })
  type!: TodoType;

  @ApiProperty({ example: 5 })
  totalCount!: number;

  @ApiProperty({ example: 4 })
  openCount!: number;

  @ApiProperty({ example: 420000 })
  plannedTotal!: number;

  @ApiProperty({ example: 275000 })
  remainingTotal!: number;
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

  @ApiProperty({ example: 265000 })
  totalRemainingAmount!: number;

  @ApiProperty({ example: 6 })
  recordedCount!: number;

  @ApiProperty({ example: 303800 })
  recordedBaseTotalAmount!: number;

  @ApiProperty({ example: 6200 })
  recordedFeeTotalAmount!: number;

  @ApiProperty({ example: 310000 })
  recordedTotalAmount!: number;

  @ApiProperty({ example: 4200 })
  recordedVarianceTotalAmount!: number;

  @ApiProperty({ example: 4 })
  feeBearingRecordingCount!: number;

  @ApiProperty({ example: 2 })
  overdueCount!: number;

  @ApiProperty({ example: 3 })
  overdueOccurrenceCount!: number;

  @ApiProperty({ example: 5 })
  dueNext7DaysCount!: number;

  @ApiProperty({ example: 45000 })
  next7DaysScheduledAmount!: number;

  @ApiProperty({ example: 11 })
  dueNext30DaysCount!: number;

  @ApiProperty({ example: 125000 })
  next30DaysScheduledAmount!: number;

  @ApiProperty({ type: TodoRecurringBudgetBurnDownDto })
  recurringBudgetBurnDown!: TodoRecurringBudgetBurnDownDto;

  @ApiProperty({ type: TodoFrequencyCompletionDto, isArray: true })
  completionByFrequency!: TodoFrequencyCompletionDto[];

  @ApiProperty({ type: TodoTypeBreakdownDto, isArray: true })
  typeBreakdown!: TodoTypeBreakdownDto[];

  @ApiPropertyOptional({
    type: TodoSummaryLatestTodoDto,
    nullable: true,
  })
  latestTodo!: TodoSummaryLatestTodoDto | null;
}
