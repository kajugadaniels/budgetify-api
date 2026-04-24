import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { ExpensesMapper } from '../../expenses/mappers/expenses.mapper';
import { ExpenseWithCreator } from '../../expenses/expenses.repository';
import { PaginatedLoanResponseDto } from '../dto/paginated-loan.response.dto';
import { LoanSettlementResponseDto } from '../dto/loan-settlement-response.dto';
import { LoanResponseDto } from '../dto/loan-response.dto';
import { LoanWithCreator } from '../loans.repository';

export class LoansMapper {
  static toLoanResponse(loan: LoanWithCreator): LoanResponseDto {
    return {
      id: loan.id,
      label: loan.label,
      direction: loan.direction,
      type: loan.type,
      counterpartyName: loan.counterpartyName,
      counterpartyContact: loan.counterpartyContact,
      amount: Number(loan.amount),
      currency: loan.currency,
      amountRwf: Number(loan.amountRwf),
      issuedDate: loan.date,
      dueDate: loan.dueDate,
      status: loan.status,
      note: loan.note,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      createdBy: {
        id: loan.user.id,
        firstName: loan.user.firstName,
        lastName: loan.user.lastName,
        avatarUrl: loan.user.avatarUrl,
      },
    };
  }

  static toLoanResponseList(loans: LoanWithCreator[]): LoanResponseDto[] {
    return loans.map((loan) => LoansMapper.toLoanResponse(loan));
  }

  static toPaginatedLoanResponse(
    payload: PaginatedResponse<LoanWithCreator>,
  ): PaginatedLoanResponseDto {
    return {
      items: LoansMapper.toLoanResponseList(payload.items),
      meta: payload.meta,
    };
  }

  static toLoanSettlementResponse(payload: {
    loan: LoanWithCreator;
    expense: ExpenseWithCreator;
  }): LoanSettlementResponseDto {
    return {
      loan: LoansMapper.toLoanResponse(payload.loan),
      expense: ExpensesMapper.toExpenseResponse(payload.expense),
    };
  }
}
