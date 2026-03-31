import { Income } from '@prisma/client';

import { IncomeResponseDto } from '../dto/income-response.dto';

export class IncomeMapper {
  static toIncomeResponse(income: Income): IncomeResponseDto {
    return {
      id: income.id,
      label: income.label,
      amount: Number(income.amount),
      category: income.category,
      date: income.date,
      received: income.received,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
    };
  }

  static toIncomeResponseList(incomes: Income[]): IncomeResponseDto[] {
    return incomes.map((income) => IncomeMapper.toIncomeResponse(income));
  }
}
