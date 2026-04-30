import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  ExpenseCategory,
  LoanBalanceEffect,
  LoanStatus,
  LoanTransactionType,
  Prisma,
} from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';
import {
  ExpenseWithCreator,
  ExpensesRepository,
} from '../expenses/expenses.repository';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { UsersService } from '../users/users.service';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { CreateLoanTransactionRequestDto } from './dto/create-loan-transaction.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import {
  LoanTransactionWithRecorder,
  LoanWithCreator,
  LoansRepository,
} from './loans.repository';

@Injectable()
export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly currencyService: CurrencyService,
  ) {}

  async listCurrentUserLoans(
    userId: string,
    query: ListLoansQueryDto,
  ): Promise<PaginatedResponse<LoanWithCreator>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);

    return this.loansRepository.findManyByUserIds(visibleUserIds, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      search: normalizeListSearch(query.search),
      status: query.status,
      direction: query.direction,
      type: query.type,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  async createCurrentUserLoan(
    userId: string,
    payload: CreateLoanRequestDto,
  ): Promise<LoanWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const issuedDate = new Date(payload.issuedDate);
    const dueDate =
      payload.dueDate === undefined ? null : new Date(payload.dueDate);

    this.assertLoanDatesAreValid(issuedDate, dueDate);
    const status = this.resolveLifecycleStatus(payload.status, dueDate);
    const amountRwf = Number(
      await this.currencyService.convertToRwf(payload.amount, payload.currency),
    );

    return this.prisma.$transaction(async (tx) => {
      const loan = await this.loansRepository.create(
        {
          userId,
          label: payload.label,
          direction: payload.direction,
          type: payload.type,
          counterpartyName: payload.counterpartyName,
          counterpartyContact: payload.counterpartyContact ?? null,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf,
          date: issuedDate,
          dueDate,
          status,
          note: payload.note ?? null,
        },
        tx,
      );

      await this.loansRepository.createTransaction(
        LoansService.buildLoanTransactionCreateData({
          loanId: loan.id,
          recordedByUserId: userId,
          type: 'DISBURSEMENT',
          currency: payload.currency,
          date: issuedDate,
          note: payload.note ?? 'Initial loan disbursement',
          amount: payload.amount,
          amountRwf,
          principalAmount: payload.amount,
          principalAmountRwf: amountRwf,
          interestAmount: 0,
          interestAmountRwf: 0,
          balanceEffect: 'INCREASE',
        }),
        tx,
      );

      return loan;
    });
  }

  async updateCurrentUserLoan(
    userId: string,
    loanId: string,
    payload: UpdateLoanRequestDto,
  ): Promise<LoanWithCreator> {
    if (
      payload.label === undefined &&
      payload.direction === undefined &&
      payload.type === undefined &&
      payload.counterpartyName === undefined &&
      payload.counterpartyContact === undefined &&
      payload.amount === undefined &&
      payload.currency === undefined &&
      payload.issuedDate === undefined &&
      payload.dueDate === undefined &&
      payload.status === undefined &&
      payload.note === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one loan field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const loan = await this.findVisibleLoanOrThrow(userId, loanId);
    const nextIssuedDate =
      payload.issuedDate === undefined
        ? loan.date
        : new Date(payload.issuedDate);
    const nextDueDate =
      payload.dueDate === undefined ? loan.dueDate : new Date(payload.dueDate);
    this.assertLoanDatesAreValid(nextIssuedDate, nextDueDate);
    const nextStatus = this.resolveLifecycleStatus(
      payload.status ?? loan.status,
      nextDueDate,
    );
    const nextCurrency = payload.currency ?? loan.currency;
    const shouldUpdateAmountRwf =
      payload.amount !== undefined || payload.currency !== undefined;
    const amountRwf = shouldUpdateAmountRwf
      ? Number(
          await this.currencyService.convertToRwf(
            payload.amount ?? Number(loan.amount),
            nextCurrency,
          ),
        )
      : undefined;
    const nextAmount = payload.amount ?? Number(loan.amount);

    return this.prisma.$transaction(async (tx) => {
      const updatedLoan = await this.loansRepository.update(
        loan.id,
        {
          label: payload.label,
          direction: payload.direction,
          type: payload.type,
          counterpartyName: payload.counterpartyName,
          counterpartyContact: payload.counterpartyContact,
          amount:
            payload.amount === undefined
              ? undefined
              : new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf,
          date: payload.issuedDate === undefined ? undefined : nextIssuedDate,
          dueDate: payload.dueDate === undefined ? undefined : nextDueDate,
          status: nextStatus,
          note: payload.note,
        },
        tx,
      );

      if (
        payload.amount !== undefined ||
        payload.currency !== undefined ||
        payload.issuedDate !== undefined ||
        payload.note !== undefined
      ) {
        const initialDisbursement =
          await this.loansRepository.findInitialDisbursementByLoanId(
            loan.id,
            tx,
          );

        if (initialDisbursement) {
          const nextAmountRwf =
            amountRwf === undefined ? Number(loan.amountRwf) : amountRwf;
          await this.loansRepository.updateTransaction(
            initialDisbursement.id,
            {
              amount: new Prisma.Decimal(nextAmount),
              currency: nextCurrency,
              amountRwf: new Prisma.Decimal(nextAmountRwf),
              principalAmount: new Prisma.Decimal(nextAmount),
              principalAmountRwf: new Prisma.Decimal(nextAmountRwf),
              date: nextIssuedDate,
              note: payload.note ?? initialDisbursement.note,
            },
            tx,
          );
        }
      }

      return updatedLoan;
    });
  }

  async sendCurrentUserLoanToExpense(
    userId: string,
    loanId: string,
    payload: SendLoanToExpenseRequestDto,
  ): Promise<{ loan: LoanWithCreator; expense: ExpenseWithCreator }> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const loan = await this.findVisibleLoanOrThrow(userId, loanId);

    if (loan.status === LoanStatus.SETTLED) {
      throw new BadRequestException(
        'This loan is already settled and cannot be sent to expenses again.',
      );
    }

    if (loan.direction !== 'BORROWED') {
      throw new BadRequestException(
        'Only borrowed loans can be settled into expenses.',
      );
    }

    if (
      loan.status === LoanStatus.CANCELLED ||
      loan.status === LoanStatus.WRITTEN_OFF ||
      loan.status === LoanStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Only active loan lifecycle states can be settled into expenses.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const expense = await this.expensesRepository.create(
        {
          userId,
          label: loan.label,
          amount: loan.amount,
          category: ExpenseCategory.LOAN,
          date: new Date(payload.date),
          note: payload.note ?? loan.note,
        },
        tx,
      );

      const updatedLoan = await this.loansRepository.update(
        loan.id,
        {
          status: LoanStatus.SETTLED,
        },
        tx,
      );

      await this.loansRepository.createTransaction(
        LoansService.buildLoanTransactionCreateData({
          loanId: loan.id,
          recordedByUserId: userId,
          type: 'REPAYMENT',
          currency: loan.currency,
          date: new Date(payload.date),
          note: payload.note ?? 'Loan settled into expenses',
          amount: Number(loan.amount),
          amountRwf: Number(loan.amountRwf),
          principalAmount: Number(loan.amount),
          principalAmountRwf: Number(loan.amountRwf),
          interestAmount: 0,
          interestAmountRwf: 0,
          balanceEffect: 'DECREASE',
        }),
        tx,
      );

      return {
        loan: updatedLoan,
        expense,
      };
    });
  }

  async listCurrentUserLoanTransactions(
    userId: string,
    loanId: string,
  ): Promise<LoanTransactionWithRecorder[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loan = await this.findVisibleLoanOrThrow(userId, loanId);

    return this.loansRepository.findTransactionsByLoanId(loan.id);
  }

  async createCurrentUserLoanTransaction(
    userId: string,
    loanId: string,
    payload: CreateLoanTransactionRequestDto,
  ): Promise<LoanTransactionWithRecorder> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loan = await this.findVisibleLoanOrThrow(userId, loanId);

    if (
      loan.status === LoanStatus.ARCHIVED ||
      loan.status === LoanStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Archived or cancelled loans cannot accept new transactions.',
      );
    }

    const transactionDate = new Date(payload.date);
    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException('Transaction date must be valid.');
    }

    let reversalTarget: LoanTransactionWithRecorder | null = null;

    if (payload.reversalOfTransactionId !== undefined) {
      reversalTarget = await this.loansRepository.findTransactionById(
        payload.reversalOfTransactionId,
      );

      if (reversalTarget === null) {
        throw new BadRequestException(
          'The transaction selected for reversal could not be found.',
        );
      }

      if (reversalTarget.loanId !== loan.id) {
        throw new BadRequestException(
          'Reversal targets must belong to the same loan ledger.',
        );
      }
    }

    const amountRwf = Number(
      await this.currencyService.convertToRwf(payload.amount, payload.currency),
    );
    const allocation = await this.resolveTransactionAllocation(
      payload,
      amountRwf,
      reversalTarget,
    );
    const nextStatus = this.resolveStatusFromTransactionType(
      loan.status,
      payload.type,
      allocation.balanceEffect,
    );

    return this.prisma.$transaction(async (tx) => {
      const transaction = await this.loansRepository.createTransaction(
        LoansService.buildLoanTransactionCreateData({
          loanId: loan.id,
          recordedByUserId: userId,
          type: payload.type,
          currency: payload.currency,
          date: transactionDate,
          note: payload.note ?? null,
          reversalOfTransactionId: payload.reversalOfTransactionId ?? null,
          amount: payload.amount,
          amountRwf,
          principalAmount: allocation.principalAmount,
          principalAmountRwf: allocation.principalAmountRwf,
          interestAmount: allocation.interestAmount,
          interestAmountRwf: allocation.interestAmountRwf,
          balanceEffect: allocation.balanceEffect,
        }),
        tx,
      );

      if (nextStatus !== loan.status) {
        await this.loansRepository.update(
          loan.id,
          {
            status: nextStatus,
          },
          tx,
        );
      }

      return transaction;
    });
  }

  async deleteCurrentUserLoan(userId: string, loanId: string): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const loan = await this.findOwnedLoanOrThrow(userId, loanId);

    await this.loansRepository.update(loan.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedLoanOrThrow(
    userId: string,
    loanId: string,
  ): Promise<LoanWithCreator> {
    return this.findVisibleLoanOrThrow(userId, loanId);
  }

  private async findVisibleLoanOrThrow(
    userId: string,
    loanId: string,
  ): Promise<LoanWithCreator> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const loan = await this.loansRepository.findActiveByIdAndUserIds(
      loanId,
      visibleUserIds,
    );

    if (!loan) {
      throw new NotFoundException('Loan record was not found.');
    }

    return loan;
  }

  private assertLoanDatesAreValid(
    issuedDate: Date,
    dueDate: Date | null,
  ): void {
    if (Number.isNaN(issuedDate.getTime())) {
      throw new BadRequestException('Issued date must be valid.');
    }

    if (dueDate === null) {
      return;
    }

    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Due date must be valid.');
    }

    if (dueDate.getTime() < issuedDate.getTime()) {
      throw new BadRequestException(
        'Due date must be on or after the issued date.',
      );
    }
  }

  private resolveLifecycleStatus(
    requestedStatus: LoanStatus | undefined,
    dueDate: Date | null,
  ): LoanStatus {
    const baseStatus = requestedStatus ?? LoanStatus.ACTIVE;

    if (
      baseStatus === LoanStatus.SETTLED ||
      baseStatus === LoanStatus.CANCELLED ||
      baseStatus === LoanStatus.WRITTEN_OFF ||
      baseStatus === LoanStatus.ARCHIVED
    ) {
      return baseStatus;
    }

    if (dueDate === null) {
      return baseStatus === LoanStatus.OVERDUE ? LoanStatus.ACTIVE : baseStatus;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    if (dueDay.getTime() < today.getTime()) {
      return LoanStatus.OVERDUE;
    }

    return baseStatus === LoanStatus.OVERDUE ? LoanStatus.ACTIVE : baseStatus;
  }

  private resolveStatusFromTransactionType(
    currentStatus: LoanStatus,
    transactionType: CreateLoanTransactionRequestDto['type'],
    balanceEffect: LoanBalanceEffect,
  ): LoanStatus {
    switch (transactionType) {
      case 'WRITE_OFF':
        return LoanStatus.WRITTEN_OFF;
      case 'REPAYMENT':
      case 'INTEREST_PAYMENT':
        return currentStatus === LoanStatus.OVERDUE
          ? LoanStatus.PARTIALLY_REPAID
          : currentStatus === LoanStatus.SETTLED
            ? LoanStatus.SETTLED
            : LoanStatus.PARTIALLY_REPAID;
      case 'ADJUSTMENT':
      case 'REVERSAL':
        return balanceEffect === 'DECREASE'
          ? currentStatus === LoanStatus.OVERDUE
            ? LoanStatus.PARTIALLY_REPAID
            : currentStatus === LoanStatus.SETTLED
              ? LoanStatus.SETTLED
              : LoanStatus.PARTIALLY_REPAID
          : currentStatus === LoanStatus.SETTLED
            ? LoanStatus.ACTIVE
            : currentStatus;
      default:
        return currentStatus;
    }
  }

  private async resolveTransactionAllocation(
    payload: CreateLoanTransactionRequestDto,
    amountRwf: number,
    reversalTarget: LoanTransactionWithRecorder | null,
  ): Promise<{
    principalAmount: number;
    principalAmountRwf: number;
    interestAmount: number;
    interestAmountRwf: number;
    balanceEffect: LoanBalanceEffect;
  }> {
    switch (payload.type) {
      case 'DISBURSEMENT':
        return {
          principalAmount: payload.amount,
          principalAmountRwf: amountRwf,
          interestAmount: 0,
          interestAmountRwf: 0,
          balanceEffect: 'INCREASE',
        };
      case 'REPAYMENT':
        return {
          principalAmount: payload.amount,
          principalAmountRwf: amountRwf,
          interestAmount: 0,
          interestAmountRwf: 0,
          balanceEffect: 'DECREASE',
        };
      case 'INTEREST_CHARGE':
        return {
          principalAmount: 0,
          principalAmountRwf: 0,
          interestAmount: payload.amount,
          interestAmountRwf: amountRwf,
          balanceEffect: 'INCREASE',
        };
      case 'INTEREST_PAYMENT':
        return {
          principalAmount: 0,
          principalAmountRwf: 0,
          interestAmount: payload.amount,
          interestAmountRwf: amountRwf,
          balanceEffect: 'DECREASE',
        };
      case 'WRITE_OFF':
        return {
          principalAmount: payload.principalAmount ?? payload.amount,
          principalAmountRwf:
            payload.principalAmount === undefined
              ? amountRwf
              : Number(
                  await this.currencyService.convertToRwf(
                    payload.principalAmount,
                    payload.currency,
                  ),
                ),
          interestAmount: payload.interestAmount ?? 0,
          interestAmountRwf:
            payload.interestAmount === undefined
              ? 0
              : Number(
                  await this.currencyService.convertToRwf(
                    payload.interestAmount,
                    payload.currency,
                  ),
                ),
          balanceEffect: 'DECREASE',
        };
      case 'ADJUSTMENT':
      case 'REVERSAL': {
        if (payload.type === 'REVERSAL' && reversalTarget !== null) {
          return {
            principalAmount: Number(reversalTarget.principalAmount),
            principalAmountRwf: Number(reversalTarget.principalAmountRwf),
            interestAmount: Number(reversalTarget.interestAmount),
            interestAmountRwf: Number(reversalTarget.interestAmountRwf),
            balanceEffect:
              reversalTarget.balanceEffect === 'INCREASE'
                ? 'DECREASE'
                : 'INCREASE',
          };
        }

        const principalAmount = payload.principalAmount ?? payload.amount;
        const interestAmount = payload.interestAmount ?? 0;

        if (
          Math.abs(principalAmount + interestAmount - payload.amount) > 0.01
        ) {
          throw new BadRequestException(
            'Principal and interest components must add up to the transaction amount.',
          );
        }

        const principalAmountRwf = Number(
          await this.currencyService.convertToRwf(
            principalAmount,
            payload.currency,
          ),
        );
        const interestAmountRwf = Number(
          await this.currencyService.convertToRwf(
            interestAmount,
            payload.currency,
          ),
        );

        return {
          principalAmount,
          principalAmountRwf,
          interestAmount,
          interestAmountRwf,
          balanceEffect: payload.balanceEffect ?? 'INCREASE',
        };
      }
      default:
        return {
          principalAmount: payload.amount,
          principalAmountRwf: amountRwf,
          interestAmount: 0,
          interestAmountRwf: 0,
          balanceEffect: 'INCREASE',
        };
    }
  }

  private static buildLoanTransactionCreateData(input: {
    loanId: string;
    recordedByUserId: string;
    type: LoanTransactionType;
    balanceEffect: LoanBalanceEffect;
    amount: number;
    amountRwf: number;
    principalAmount: number;
    principalAmountRwf: number;
    interestAmount: number;
    interestAmountRwf: number;
    currency: Currency;
    date: Date;
    note: string | null;
    reversalOfTransactionId?: string | null;
  }): Prisma.LoanTransactionUncheckedCreateInput {
    return {
      loanId: input.loanId,
      recordedByUserId: input.recordedByUserId,
      type: input.type,
      balanceEffect: input.balanceEffect,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency,
      amountRwf: new Prisma.Decimal(input.amountRwf),
      principalAmount: new Prisma.Decimal(input.principalAmount),
      principalAmountRwf: new Prisma.Decimal(input.principalAmountRwf),
      interestAmount: new Prisma.Decimal(input.interestAmount),
      interestAmountRwf: new Prisma.Decimal(input.interestAmountRwf),
      date: input.date,
      note: input.note,
      reversalOfTransactionId: input.reversalOfTransactionId ?? null,
    };
  }
}
