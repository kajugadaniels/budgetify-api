import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpensePaymentMethod,
  TodoFrequency,
  TodoRecordingExpenseSource,
  TodoStatus,
  TodoType,
} from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';

export class TodoRecordingExpenseSummaryDto {
  @ApiProperty({ example: '4e2522ae-ec1c-4a30-84bb-cba3e7fe29f2' })
  id!: string;

  @ApiProperty({ example: 'School transport top up' })
  label!: string;

  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.TRANSPORT,
  })
  category!: ExpenseCategory;

  @ApiProperty({ example: '2026-04-22T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({ example: 14210 })
  totalAmountRwf!: number;

  @ApiProperty({ example: 210 })
  feeAmountRwf!: number;
}

export class TodoRecordingTodoSummaryDto {
  @ApiProperty({ example: 'dcb2b33f-c0bc-4897-aee2-d34de8fa4f7f' })
  id!: string;

  @ApiProperty({ example: 'School transport top up' })
  name!: string;

  @ApiProperty({
    enum: TodoFrequency,
    example: TodoFrequency.MONTHLY,
  })
  frequency!: TodoFrequency;

  @ApiProperty({
    enum: TodoType,
    example: TodoType.RECURRING_OBLIGATION,
  })
  type!: TodoType;

  @ApiProperty({
    enum: TodoStatus,
    example: TodoStatus.RECORDED,
  })
  status!: TodoStatus;
}

export class TodoRecordingResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'dcb2b33f-c0bc-4897-aee2-d34de8fa4f7f' })
  todoId!: string;

  @ApiPropertyOptional({
    example: '4e2522ae-ec1c-4a30-84bb-cba3e7fe29f2',
    nullable: true,
  })
  expenseId!: string | null;

  @ApiProperty({
    example: '2026-04-22',
    description: 'Occurrence date recorded for this todo entry.',
  })
  occurrenceDate!: string;

  @ApiProperty({
    example: 14000,
    description:
      'Planned amount for this todo occurrence before the actual expense was recorded.',
  })
  plannedAmount!: number;

  @ApiProperty({
    example: 14000,
    description: 'Base amount normalized to RWF for todo budget tracking.',
  })
  baseAmount!: number;

  @ApiProperty({
    example: 210,
    description: 'Payment fee normalized to RWF.',
  })
  feeAmount!: number;

  @ApiProperty({
    example: 14210,
    description: 'Total charged amount normalized to RWF.',
  })
  totalChargedAmount!: number;

  @ApiProperty({
    example: 210,
    description:
      'Difference between totalChargedAmount and plannedAmount. Positive means over plan, negative means under plan.',
  })
  varianceAmount!: number;

  @ApiProperty({
    enum: TodoRecordingExpenseSource,
    example: TodoRecordingExpenseSource.GENERATED,
    description:
      'Whether the linked expense was created directly from the todo flow or attached from an existing expense record.',
  })
  expenseSource!: TodoRecordingExpenseSource;

  @ApiProperty({
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.MOBILE_MONEY,
  })
  paymentMethod!: ExpensePaymentMethod;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyChannel,
    nullable: true,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  mobileMoneyChannel!: ExpenseMobileMoneyChannel | null;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    nullable: true,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  mobileMoneyNetwork!: ExpenseMobileMoneyNetwork | null;

  @ApiProperty({
    example: '2026-04-22T10:41:00.000Z',
  })
  recordedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  recordedBy!: CreatedByResponseDto;

  @ApiPropertyOptional({
    example: '2026-04-22T11:10:00.000Z',
    nullable: true,
    description:
      'When present, this recording has been reversed and no longer counts against the todo budget.',
  })
  reversedAt!: Date | null;

  @ApiPropertyOptional({
    example: 'Recorded the wrong occurrence date and reopened the plan.',
    nullable: true,
  })
  reversalReason!: string | null;

  @ApiPropertyOptional({
    type: CreatedByResponseDto,
    nullable: true,
  })
  reversedBy!: CreatedByResponseDto | null;

  @ApiProperty({ type: TodoRecordingTodoSummaryDto })
  todo!: TodoRecordingTodoSummaryDto;

  @ApiPropertyOptional({
    type: TodoRecordingExpenseSummaryDto,
    nullable: true,
  })
  expense!: TodoRecordingExpenseSummaryDto | null;
}
