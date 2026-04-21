import { IncomeDetailResponseDto } from '../dto/income-detail.response.dto';
import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedIncomeResponseDto } from '../dto/paginated-income.response.dto';
import { IncomeResponseDto } from '../dto/income-response.dto';
import { IncomeWithCreator } from '../income.repository';
import { IncomeSavingAllocationSource } from '../../savings/savings.repository';
import { IncomeAllocationStatus } from '../dto/income-allocation-status.enum';

interface IncomeAllocationSummary {
  allocatedToSavingsRwf: number;
  remainingAvailableRwf: number;
  allocationStatus: IncomeAllocationStatus;
}

export class IncomeMapper {
  static toIncomeResponse(
    income: IncomeWithCreator,
    allocationSummary?: IncomeAllocationSummary,
  ): IncomeResponseDto {
    return {
      id: income.id,
      label: income.label,
      amount: Number(income.amount),
      currency: income.currency,
      amountRwf: Number(income.amountRwf),
      category: income.category,
      date: income.date,
      received: income.received,
      allocatedToSavingsRwf: allocationSummary?.allocatedToSavingsRwf ?? 0,
      remainingAvailableRwf:
        allocationSummary?.remainingAvailableRwf ?? Number(income.amountRwf),
      allocationStatus:
        allocationSummary?.allocationStatus ??
        IncomeAllocationStatus.UNALLOCATED,
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
    allocationSummaries?: Map<string, IncomeAllocationSummary>,
  ): IncomeResponseDto[] {
    return incomes.map((income) =>
      IncomeMapper.toIncomeResponse(
        income,
        allocationSummaries?.get(income.id),
      ),
    );
  }

  static toPaginatedIncomeResponse(
    payload: PaginatedResponse<IncomeWithCreator>,
    allocationSummaries?: Map<string, IncomeAllocationSummary>,
  ): PaginatedIncomeResponseDto {
    return {
      items: IncomeMapper.toIncomeResponseList(
        payload.items,
        allocationSummaries,
      ),
      meta: payload.meta,
    };
  }

  static toIncomeDetailResponse(
    income: IncomeWithCreator,
    allocations: IncomeSavingAllocationSource[],
    allocationSummary: IncomeAllocationSummary,
  ): IncomeDetailResponseDto {
    return {
      ...IncomeMapper.toIncomeResponse(income, allocationSummary),
      allocatedToSavingsRwf: allocationSummary.allocatedToSavingsRwf,
      remainingAvailableRwf: allocationSummary.remainingAvailableRwf,
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
        isReversed: allocation.savingTransaction.reversedByTransaction !== null,
        isReversal:
          allocation.savingTransaction.reversalOfTransactionId !== null,
        reversedByTransactionId:
          allocation.savingTransaction.reversedByTransaction?.id ?? null,
      })),
    };
  }
}
