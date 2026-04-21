import { IncomeDetailResponseDto } from '../dto/income-detail.response.dto';
import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedIncomeResponseDto } from '../dto/paginated-income.response.dto';
import { IncomeResponseDto } from '../dto/income-response.dto';
import { IncomeWithCreator } from '../income.repository';
import { IncomeSavingAllocationSource } from '../../savings/savings.repository';

export class IncomeMapper {
  static toIncomeResponse(income: IncomeWithCreator): IncomeResponseDto {
    return {
      id: income.id,
      label: income.label,
      amount: Number(income.amount),
      currency: income.currency,
      amountRwf: Number(income.amountRwf),
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

  static toIncomeDetailResponse(
    income: IncomeWithCreator,
    allocations: IncomeSavingAllocationSource[],
  ): IncomeDetailResponseDto {
    const allocatedToSavingsRwf = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.amountRwf),
      0,
    );

    return {
      ...IncomeMapper.toIncomeResponse(income),
      allocatedToSavingsRwf,
      remainingAvailableRwf: Math.max(
        Number(income.amountRwf) - allocatedToSavingsRwf,
        0,
      ),
      allocationCount: allocations.length,
      savingAllocations: allocations.map((allocation) => ({
        id: allocation.id,
        savingId: allocation.savingTransaction.saving.id,
        savingLabel: allocation.savingTransaction.saving.label,
        transactionId: allocation.savingTransaction.id,
        transactionDate: allocation.savingTransaction.date,
        amount: Number(allocation.amount),
        currency: allocation.currency,
        amountRwf: Number(allocation.amountRwf),
        note: allocation.savingTransaction.note,
      })),
    };
  }
}
