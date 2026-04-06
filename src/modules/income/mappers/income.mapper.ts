import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedIncomeResponseDto } from '../dto/paginated-income.response.dto';
import { IncomeResponseDto } from '../dto/income-response.dto';
import { IncomeWithCreator } from '../income.repository';

export class IncomeMapper {
  static toIncomeResponse(income: IncomeWithCreator): IncomeResponseDto {
    return {
      id: income.id,
      label: income.label,
      amount: Number(income.amount),
      category: income.category,
      date: income.date,
      received: income.received,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
      createdBy: {
        id: income.user.id,
        firstName: income.user.firstName,
        lastName: income.user.lastName,
        avatarUrl: income.user.avatarUrl,
      },
    };
  }

  static toIncomeResponseList(
    incomes: IncomeWithCreator[],
  ): IncomeResponseDto[] {
    return incomes.map((income) => IncomeMapper.toIncomeResponse(income));
  }

  static toPaginatedIncomeResponse(
    payload: PaginatedResponse<IncomeWithCreator>,
  ): PaginatedIncomeResponseDto {
    return {
      items: IncomeMapper.toIncomeResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
