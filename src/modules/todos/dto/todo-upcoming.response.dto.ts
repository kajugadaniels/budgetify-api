import { ApiProperty } from '@nestjs/swagger';
import { TodoFrequency } from '@prisma/client';

export class TodoUpcomingItemDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Pay internet' })
  name!: string;

  @ApiProperty({ enum: TodoFrequency, example: TodoFrequency.MONTHLY })
  frequency!: TodoFrequency;

  @ApiProperty({ example: 15000 })
  amount!: number;
}

export class TodoUpcomingDayDto {
  @ApiProperty({ example: '2026-04-22' })
  date!: string;

  @ApiProperty({ example: 2 })
  itemCount!: number;

  @ApiProperty({ example: 30000 })
  totalAmount!: number;

  @ApiProperty({ type: TodoUpcomingItemDto, isArray: true })
  items!: TodoUpcomingItemDto[];
}

export class TodoReserveItemDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'School fees' })
  name!: string;

  @ApiProperty({ enum: TodoFrequency, example: TodoFrequency.MONTHLY })
  frequency!: TodoFrequency;

  @ApiProperty({ example: 120000 })
  targetAmount!: number;

  @ApiProperty({ example: 45000 })
  usedAmount!: number;

  @ApiProperty({ example: 75000 })
  remainingAmount!: number;

  @ApiProperty({ example: 3 })
  remainingOccurrenceCount!: number;
}

export class TodoReserveSummaryDto {
  @ApiProperty({ example: 240000 })
  targetAmount!: number;

  @ApiProperty({ example: 90000 })
  usedAmount!: number;

  @ApiProperty({ example: 150000 })
  remainingAmount!: number;

  @ApiProperty({ type: TodoReserveItemDto, isArray: true })
  items!: TodoReserveItemDto[];
}

export class TodoUpcomingResponseDto {
  @ApiProperty({ example: 7 })
  windowDays!: number;

  @ApiProperty({ example: 4 })
  daysWithPlans!: number;

  @ApiProperty({ example: 6 })
  occurrenceCount!: number;

  @ApiProperty({ example: 78000 })
  totalScheduledAmount!: number;

  @ApiProperty({ example: 2 })
  overdueCount!: number;

  @ApiProperty({ type: TodoReserveSummaryDto })
  reserveSummary!: TodoReserveSummaryDto;

  @ApiProperty({ type: TodoUpcomingDayDto, isArray: true })
  days!: TodoUpcomingDayDto[];
}
