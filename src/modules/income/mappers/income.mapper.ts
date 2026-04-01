import { Income } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedIncomeResponseDto } from '../dto/paginated-income.response.dto';
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

  static toPaginatedIncomeResponse(
    payload: PaginatedResponse<Income>,
  ): PaginatedIncomeResponseDto {
    return {
      items: IncomeMapper.toIncomeResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
