import { Expense, Loan } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { ExpensesMapper } from '../../expenses/mappers/expenses.mapper';
import { PaginatedLoanResponseDto } from '../dto/paginated-loan.response.dto';
import { LoanSettlementResponseDto } from '../dto/loan-settlement-response.dto';
import { LoanResponseDto } from '../dto/loan-response.dto';

export class LoansMapper {
  static toLoanResponse(loan: Loan): LoanResponseDto {
    return {
      id: loan.id,
      label: loan.label,
      amount: Number(loan.amount),
      date: loan.date,
      paid: loan.paid,
      note: loan.note,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };
  }

  static toLoanResponseList(loans: Loan[]): LoanResponseDto[] {
    return loans.map((loan) => LoansMapper.toLoanResponse(loan));
  }

  static toPaginatedLoanResponse(
    payload: PaginatedResponse<Loan>,
  ): PaginatedLoanResponseDto {
    return {
      items: LoansMapper.toLoanResponseList(payload.items),
      meta: payload.meta,
    };
  }

  static toLoanSettlementResponse(payload: {
    loan: Loan;
    expense: Expense;
  }): LoanSettlementResponseDto {
    return {
      loan: LoansMapper.toLoanResponse(payload.loan),
      expense: ExpensesMapper.toExpenseResponse(payload.expense),
    };
  }
}
