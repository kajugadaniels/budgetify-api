import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { ExpensesMapper } from '../../expenses/mappers/expenses.mapper';
import { ExpenseWithCreator } from '../../expenses/expenses.repository';
import { PaginatedLoanResponseDto } from '../dto/paginated-loan.response.dto';
import { LoanSettlementResponseDto } from '../dto/loan-settlement-response.dto';
import { LoanTransactionResponseDto } from '../dto/loan-transaction.response.dto';
import { LoanResponseDto } from '../dto/loan-response.dto';
import {
  LoanTransactionWithRecorder,
  LoanWithCreator,
} from '../loans.repository';

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

  static toLoanTransactionResponse(
    transaction: LoanTransactionWithRecorder,
  ): LoanTransactionResponseDto {
    return {
      id: transaction.id,
      loanId: transaction.loanId,
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      amountRwf: Number(transaction.amountRwf),
      date: transaction.date,
      note: transaction.note,
      reversalOfTransactionId: transaction.reversalOfTransactionId,
      recordedBy: {
        id: transaction.recordedBy.id,
        firstName: transaction.recordedBy.firstName,
        lastName: transaction.recordedBy.lastName,
        avatarUrl: transaction.recordedBy.avatarUrl,
      },
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
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
