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
    const summary = LoansMapper.summarizeLoanBalances(loan);

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
      originalPrincipal: summary.originalPrincipal,
      originalPrincipalRwf: summary.originalPrincipalRwf,
      principalRepaid: summary.principalRepaid,
      principalRepaidRwf: summary.principalRepaidRwf,
      principalOutstanding: summary.principalOutstanding,
      principalOutstandingRwf: summary.principalOutstandingRwf,
      interestCharged: summary.interestCharged,
      interestChargedRwf: summary.interestChargedRwf,
      interestPaid: summary.interestPaid,
      interestPaidRwf: summary.interestPaidRwf,
      interestOutstanding: summary.interestOutstanding,
      interestOutstandingRwf: summary.interestOutstandingRwf,
      totalOutstanding: summary.totalOutstanding,
      totalOutstandingRwf: summary.totalOutstandingRwf,
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
      balanceEffect: transaction.balanceEffect,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      amountRwf: Number(transaction.amountRwf),
      principalAmount: Number(transaction.principalAmount),
      principalAmountRwf: Number(transaction.principalAmountRwf),
      interestAmount: Number(transaction.interestAmount),
      interestAmountRwf: Number(transaction.interestAmountRwf),
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

  private static summarizeLoanBalances(loan: LoanWithCreator): {
    originalPrincipal: number;
    originalPrincipalRwf: number;
    principalRepaid: number;
    principalRepaidRwf: number;
    principalOutstanding: number;
    principalOutstandingRwf: number;
    interestCharged: number;
    interestChargedRwf: number;
    interestPaid: number;
    interestPaidRwf: number;
    interestOutstanding: number;
    interestOutstandingRwf: number;
    totalOutstanding: number;
    totalOutstandingRwf: number;
  } {
    const totals = loan.transactions.reduce(
      (accumulator, transaction) => {
        const principal = Number(transaction.principalAmount);
        const principalRwf = Number(transaction.principalAmountRwf);
        const interest = Number(transaction.interestAmount);
        const interestRwf = Number(transaction.interestAmountRwf);
        const isIncrease = transaction.balanceEffect === 'INCREASE';

        if (isIncrease) {
          accumulator.principalIn += principal;
          accumulator.principalInRwf += principalRwf;
          accumulator.interestIn += interest;
          accumulator.interestInRwf += interestRwf;
        } else {
          accumulator.principalOut += principal;
          accumulator.principalOutRwf += principalRwf;
          accumulator.interestOut += interest;
          accumulator.interestOutRwf += interestRwf;
        }

        return accumulator;
      },
      {
        principalIn: 0,
        principalInRwf: 0,
        principalOut: 0,
        principalOutRwf: 0,
        interestIn: 0,
        interestInRwf: 0,
        interestOut: 0,
        interestOutRwf: 0,
      },
    );

    const principalOutstanding = Math.max(
      totals.principalIn - totals.principalOut,
      0,
    );
    const principalOutstandingRwf = Math.max(
      totals.principalInRwf - totals.principalOutRwf,
      0,
    );
    const interestOutstanding = Math.max(
      totals.interestIn - totals.interestOut,
      0,
    );
    const interestOutstandingRwf = Math.max(
      totals.interestInRwf - totals.interestOutRwf,
      0,
    );

    return {
      originalPrincipal: totals.principalIn,
      originalPrincipalRwf: totals.principalInRwf,
      principalRepaid: totals.principalOut,
      principalRepaidRwf: totals.principalOutRwf,
      principalOutstanding,
      principalOutstandingRwf,
      interestCharged: totals.interestIn,
      interestChargedRwf: totals.interestInRwf,
      interestPaid: totals.interestOut,
      interestPaidRwf: totals.interestOutRwf,
      interestOutstanding,
      interestOutstandingRwf,
      totalOutstanding: principalOutstanding + interestOutstanding,
      totalOutstandingRwf: principalOutstandingRwf + interestOutstandingRwf,
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
