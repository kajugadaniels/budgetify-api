import { SavingTransactionType } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedSavingResponseDto } from '../dto/paginated-saving.response.dto';
import { SavingResponseDto } from '../dto/saving-response.dto';
import { SavingWithCreator } from '../savings.repository';

export class SavingsMapper {
  static toSavingResponse(saving: SavingWithCreator): SavingResponseDto {
    const totals = saving.transactions.reduce(
      (accumulator, transaction) => {
        const amountRwf = Number(transaction.amountRwf);

        if (transaction.type === SavingTransactionType.DEPOSIT) {
          accumulator.totalDepositedRwf += amountRwf;
        }

        if (transaction.type === SavingTransactionType.WITHDRAWAL) {
          accumulator.totalWithdrawnRwf += amountRwf;
        }

        if (transaction.type === SavingTransactionType.ADJUSTMENT) {
          accumulator.adjustmentRwf += amountRwf;
        }

        return accumulator;
      },
      {
        totalDepositedRwf: 0,
        totalWithdrawnRwf: 0,
        adjustmentRwf: 0,
      },
    );

    return {
      id: saving.id,
      label: saving.label,
      amount: Number(saving.amount),
      currency: saving.currency,
      amountRwf: Number(saving.amountRwf),
      totalDepositedRwf: totals.totalDepositedRwf,
      totalWithdrawnRwf: totals.totalWithdrawnRwf,
      currentBalanceRwf:
        totals.totalDepositedRwf -
        totals.totalWithdrawnRwf +
        totals.adjustmentRwf,
      date: saving.date,
      note: saving.note,
      stillHave: saving.stillHave,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt,
      createdBy: {
        id: saving.user.id,
        firstName: saving.user.firstName,
        lastName: saving.user.lastName,
        avatarUrl: saving.user.avatarUrl,
      },
    };
  }

  static toSavingResponseList(
    savings: SavingWithCreator[],
  ): SavingResponseDto[] {
    return savings.map((saving) => SavingsMapper.toSavingResponse(saving));
  }

  static toPaginatedSavingResponse(
    payload: PaginatedResponse<SavingWithCreator>,
  ): PaginatedSavingResponseDto {
    return {
      items: SavingsMapper.toSavingResponseList(payload.items),
      meta: payload.meta,
    };
  }
}
