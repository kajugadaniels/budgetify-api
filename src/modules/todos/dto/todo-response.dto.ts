import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpensePaymentMethod,
  TodoFrequency,
  TodoPriority,
  TodoStatus,
  TodoType,
} from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';
import { TodoImageResponseDto } from './todo-image-response.dto';
import { TodoOccurrenceResponseDto } from './todo-occurrence.response.dto';
import { TodoRecordingResponseDto } from './todo-recording.response.dto';

export class TodoResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Renew car insurance' })
  name!: string;

  @ApiProperty({ example: 85000 })
  price!: number;

  @ApiProperty({
    enum: TodoType,
    example: TodoType.WISHLIST,
    description: 'Planning intent for this todo item.',
  })
  type!: TodoType;

  @ApiProperty({
    enum: TodoPriority,
    example: TodoPriority.TOP_PRIORITY,
  })
  priority!: TodoPriority;

  @ApiProperty({
    enum: TodoStatus,
    example: TodoStatus.ACTIVE,
    description: 'Current lifecycle status of the todo item.',
  })
  status!: TodoStatus;

  @ApiProperty({
    enum: TodoFrequency,
    example: TodoFrequency.ONCE,
    description: 'How often this todo recurs.',
  })
  frequency!: TodoFrequency;

  @ApiPropertyOptional({
    enum: ExpenseCategory,
    example: ExpenseCategory.SCHOOL_FEES,
    nullable: true,
    description:
      'Default expense category to prefill when this todo is recorded as an expense.',
  })
  defaultExpenseCategory!: ExpenseCategory | null;

  @ApiPropertyOptional({
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.MOBILE_MONEY,
    nullable: true,
    description:
      'Default payment method to prefill when this todo is recorded as an expense.',
  })
  defaultPaymentMethod!: ExpensePaymentMethod | null;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
    nullable: true,
    description:
      'Default mobile money transfer type when the default payment method is mobile money.',
  })
  defaultMobileMoneyChannel!: ExpenseMobileMoneyChannel | null;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    example: ExpenseMobileMoneyNetwork.ON_NET,
    nullable: true,
    description:
      'Default mobile money network when the default channel is a P2P transfer.',
  })
  defaultMobileMoneyNetwork!: ExpenseMobileMoneyNetwork | null;

  @ApiPropertyOptional({
    example: 'GS Kagarama',
    nullable: true,
    description: 'Merchant, vendor, payee, or destination label for the plan.',
  })
  payee!: string | null;

  @ApiPropertyOptional({
    example: 'Second-term fees for May intake.',
    nullable: true,
    description:
      'Reusable note or rationale that prefills expense recording for this todo.',
  })
  expenseNote!: string | null;

  @ApiPropertyOptional({
    example: '2026-04-02',
    nullable: true,
    description: 'Start date of the schedule (ISO date). Null for ONCE todos.',
  })
  startDate!: string | null;

  @ApiPropertyOptional({
    example: '2026-04-09',
    nullable: true,
    description: 'End date of the schedule (ISO date). Null for ONCE todos.',
  })
  endDate!: string | null;

  @ApiProperty({
    type: [Number],
    example: [1, 3, 5],
    description:
      'Days to repeat on for WEEKLY todos. Uses 0–6 (Sun–Sat). Empty for non-weekly schedules.',
  })
  frequencyDays!: number[];

  @ApiProperty({
    type: [String],
    example: ['2026-04-04', '2026-04-11', '2026-04-18', '2026-04-25'],
    description:
      'Exact occurrence dates currently scheduled for this todo. ONCE todos contain one date.',
  })
  occurrenceDates!: string[];

  @ApiProperty({
    type: [String],
    example: ['2026-04-04', '2026-04-11'],
    description:
      'Active schedule occurrence dates that have already been recorded to expenses.',
  })
  recordedOccurrenceDates!: string[];

  @ApiProperty({
    type: TodoOccurrenceResponseDto,
    isArray: true,
    description:
      'Current schedule occurrences for this todo, including their resolved tracking state.',
  })
  occurrences!: TodoOccurrenceResponseDto[];

  @ApiPropertyOptional({
    example: 6000,
    nullable: true,
    description:
      'Remaining budget after expense deductions. Null for ONCE todos. Starts at price for recurring todos.',
  })
  remainingAmount!: number | null;

  @ApiProperty({
    example: 2,
    description:
      'Current number of active expense recordings linked to this todo. Reversed recordings stay in the audit trail but are excluded from this count.',
  })
  recordingCount!: number;

  @ApiProperty({
    type: TodoRecordingResponseDto,
    isArray: true,
    description: 'Most recent expense recordings for this todo, newest first.',
  })
  recordings!: TodoRecordingResponseDto[];

  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1711742100/todos/todo-id/sample.jpg',
    nullable: true,
  })
  coverImageUrl!: string | null;

  @ApiProperty({ example: 3 })
  imageCount!: number;

  @ApiProperty({
    type: TodoImageResponseDto,
    isArray: true,
  })
  images!: TodoImageResponseDto[];

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T20:15:30.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;

  @ApiProperty({
    type: CreatedByResponseDto,
    description:
      'User currently responsible for this plan inside the shared workspace.',
  })
  responsibleUser!: CreatedByResponseDto;
}
