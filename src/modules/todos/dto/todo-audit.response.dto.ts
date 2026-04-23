import { ApiProperty } from '@nestjs/swagger';

import {
  TodoFrequencyCompletionDto,
  TodoRecurringBudgetBurnDownDto,
  TodoTypeBreakdownDto,
} from './todo-summary.response.dto';

export class TodoAuditResponseDto {
  @ApiProperty({ example: '2026-04-01' })
  periodStartDate!: string | null;

  @ApiProperty({ example: '2026-04-30' })
  periodEndDate!: string | null;

  @ApiProperty({ example: 18 })
  todoCount!: number;

  @ApiProperty({ example: 11 })
  openTodoCount!: number;

  @ApiProperty({ example: 7 })
  recurringTodoCount!: number;

  @ApiProperty({ example: 820000 })
  totalPlannedAmount!: number;

  @ApiProperty({ example: 285000 })
  totalRemainingAmount!: number;

  @ApiProperty({ example: 9 })
  recordingCount!: number;

  @ApiProperty({ example: 293000 })
  totalRecordedBaseAmount!: number;

  @ApiProperty({ example: 5800 })
  totalRecordedFeeAmount!: number;

  @ApiProperty({ example: 298800 })
  totalRecordedChargedAmount!: number;

  @ApiProperty({ example: 3800 })
  totalRecordedVarianceAmount!: number;

  @ApiProperty({ example: 4 })
  feeBearingRecordingCount!: number;

  @ApiProperty({ example: 3 })
  overdueTodoCount!: number;

  @ApiProperty({ example: 5 })
  overdueOccurrenceCount!: number;

  @ApiProperty({ example: 4 })
  dueThisWeekCount!: number;

  @ApiProperty({ example: 72000 })
  dueThisWeekAmount!: number;

  @ApiProperty({ example: 9 })
  dueThisMonthCount!: number;

  @ApiProperty({ example: 164000 })
  dueThisMonthAmount!: number;

  @ApiProperty({ example: 33 })
  completionPercentage!: number;

  @ApiProperty({ type: TodoRecurringBudgetBurnDownDto })
  recurringBudgetBurnDown!: TodoRecurringBudgetBurnDownDto;

  @ApiProperty({ type: TodoFrequencyCompletionDto, isArray: true })
  completionByFrequency!: TodoFrequencyCompletionDto[];

  @ApiProperty({ type: TodoTypeBreakdownDto, isArray: true })
  typeBreakdown!: TodoTypeBreakdownDto[];
}
