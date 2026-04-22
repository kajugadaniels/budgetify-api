import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
  ExpensePaymentMethod,
} from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';
import { ExpenseLinkedTodoResponseDto } from './expense-linked-todo.response.dto';

export class ExpenseResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({ example: 'Kigali Market groceries' })
  label!: string;

  @ApiProperty({ example: 12500 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 12500 })
  amountRwf!: number;

  @ApiProperty({ example: 100 })
  feeAmount!: number;

  @ApiProperty({ example: 100 })
  feeAmountRwf!: number;

  @ApiProperty({ example: 12600 })
  totalAmountRwf!: number;

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
    enum: ExpenseMobileMoneyProvider,
    nullable: true,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  mobileMoneyProvider!: ExpenseMobileMoneyProvider | null;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    nullable: true,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  mobileMoneyNetwork!: ExpenseMobileMoneyNetwork | null;

  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD_DINING,
  })
  category!: ExpenseCategory;

  @ApiProperty({ example: '2026-03-28T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Weekly grocery run — vegetables and dairy',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({ example: '2026-03-28T10:15:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-28T10:15:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;

  @ApiPropertyOptional({
    type: ExpenseLinkedTodoResponseDto,
    nullable: true,
  })
  linkedTodo!: ExpenseLinkedTodoResponseDto | null;
}
