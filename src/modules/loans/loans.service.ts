import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  ExpenseCategory,
  IncomeCategory,
  LoanBalanceEffect,
  LoanDirection,
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
import {
  IncomeRepository,
  IncomeWithCreator,
} from '../income/income.repository';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { SavingsRepository } from '../savings/savings.repository';
import { UsersService } from '../users/users.service';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { CreateLoanTransactionRequestDto } from './dto/create-loan-transaction.request.dto';
import { LinkLoanTransactionFinancialRecordRequestDto } from './dto/link-loan-transaction-financial-record.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { LoanAgingResponseDto } from './dto/loan-aging.response.dto';
import { LoanAuditResponseDto } from './dto/loan-audit.response.dto';
import { LoanReportingQueryDto } from './dto/loan-reporting.query.dto';
import { LoanSummaryResponseDto } from './dto/loan-summary.response.dto';
import { ReverseLoanTransactionRequestDto } from './dto/reverse-loan-transaction.request.dto';
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
    private readonly incomeRepository: IncomeRepository,
    private readonly savingsRepository: SavingsRepository,
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

  async summarizeCurrentUserLoans(
    userId: string,
    query: LoanReportingQueryDto,
  ): Promise<LoanSummaryResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loans = await this.findReportingLoans(userId, query);
    const dateRange = resolveListDateRange(query);
    const periodTransactions = this.filterTransactionsByDateRange(
      loans,
      dateRange?.dateFrom,
      dateRange?.dateTo,
    );
    const audit = this.buildLoanAuditSnapshot(loans, periodTransactions, {
      periodStartDate: null,
      periodEndDate: null,
    });
    const latestTransaction = periodTransactions
      .slice()
      .sort(
        (left, right) =>
          right.transaction.date.getTime() - left.transaction.date.getTime() ||
          right.transaction.createdAt.getTime() -
            left.transaction.createdAt.getTime(),
      )[0];

    return {
      totalLoanCount: audit.loanCount,
      activeLoanCount: loans.filter(
        (loan) =>
          loan.status === LoanStatus.ACTIVE ||
          loan.status === LoanStatus.PARTIALLY_REPAID ||
          loan.status === LoanStatus.OVERDUE,
      ).length,
      settledLoanCount: loans.filter(
        (loan) => loan.status === LoanStatus.SETTLED,
      ).length,
      overdueLoanCount:
        audit.statusBreakdown.find((item) => item.status === LoanStatus.OVERDUE)
          ?.loanCount ?? 0,
      borrowedOutstandingRwf:
        audit.exposureByDirection.find(
          (item) => item.direction === LoanDirection.BORROWED,
        )?.totalOutstandingRwf ?? 0,
      lentOutstandingRwf:
        audit.exposureByDirection.find(
          (item) => item.direction === LoanDirection.LENT,
        )?.totalOutstandingRwf ?? 0,
      interestPayableOutstandingRwf:
        audit.exposureByDirection.find(
          (item) => item.direction === LoanDirection.BORROWED,
        )?.interestOutstandingRwf ?? 0,
      interestReceivableOutstandingRwf:
        audit.exposureByDirection.find(
          (item) => item.direction === LoanDirection.LENT,
        )?.interestOutstandingRwf ?? 0,
      repaymentsThisPeriodRwf: periodTransactions
        .filter(({ transaction }) => transaction.balanceEffect === 'DECREASE')
        .reduce(
          (sum, { transaction }) => sum + Number(transaction.amountRwf),
          0,
        ),
      interestEarnedThisPeriodRwf: periodTransactions
        .filter(
          ({ loan, transaction }) =>
            loan.direction === LoanDirection.LENT &&
            transaction.balanceEffect === 'DECREASE',
        )
        .reduce(
          (sum, { transaction }) => sum + Number(transaction.interestAmountRwf),
          0,
        ),
      interestPaidThisPeriodRwf: periodTransactions
        .filter(
          ({ loan, transaction }) =>
            loan.direction === LoanDirection.BORROWED &&
            transaction.balanceEffect === 'DECREASE',
        )
        .reduce(
          (sum, { transaction }) => sum + Number(transaction.interestAmountRwf),
          0,
        ),
      linkedExpenseCount: audit.linkedExpenseCount,
      linkedIncomeCount: audit.linkedIncomeCount,
      reversedTransactionCount: audit.reversedTransactionCount,
      exposureByDirection: audit.exposureByDirection,
      statusBreakdown: audit.statusBreakdown,
      latestTransaction:
        latestTransaction === undefined
          ? null
          : {
              id: latestTransaction.transaction.id,
              loanLabel: latestTransaction.loan.label,
              amountRwf: Number(latestTransaction.transaction.amountRwf),
              date: latestTransaction.transaction.date,
            },
    };
  }

  async auditCurrentUserLoans(
    userId: string,
    query: LoanReportingQueryDto,
  ): Promise<LoanAuditResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loans = await this.findReportingLoans(userId, query);
    const dateRange = resolveListDateRange(query);
    const periodTransactions = this.filterTransactionsByDateRange(
      loans,
      dateRange?.dateFrom,
      dateRange?.dateTo,
    );

    return this.buildLoanAuditSnapshot(loans, periodTransactions, {
      periodStartDate: dateRange?.dateFrom.toISOString().slice(0, 10) ?? null,
      periodEndDate:
        dateRange?.dateTo === undefined
          ? null
          : new Date(dateRange.dateTo.getTime() - 1).toISOString().slice(0, 10),
    });
  }

  async ageCurrentUserLoans(
    userId: string,
    query: LoanReportingQueryDto,
  ): Promise<LoanAgingResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loans = await this.findReportingLoans(userId, query);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const overdueLoans = loans.filter((loan) => {
      if (loan.dueDate === null) {
        return false;
      }

      return (
        loan.dueDate.getTime() < today.getTime() &&
        this.summarizeLoanBalancesRwf(loan).totalOutstandingRwf > 0.01
      );
    });
    const bucketNames = ['0-30', '31-60', '61-90', '90+'];
    const buckets = bucketNames.map((bucket) =>
      this.buildAgingBucket(
        bucket,
        overdueLoans.filter((loan) =>
          this.isLoanInAgingBucket(loan, bucket, today),
        ),
      ),
    );

    return {
      asOfDate: today.toISOString().slice(0, 10),
      overdueLoanCount: overdueLoans.length,
      overdueOutstandingRwf: overdueLoans.reduce(
        (sum, loan) =>
          sum + this.summarizeLoanBalancesRwf(loan).totalOutstandingRwf,
        0,
      ),
      buckets,
      byDirection: [LoanDirection.BORROWED, LoanDirection.LENT].map(
        (direction) => {
          const directionLoans = overdueLoans.filter(
            (loan) => loan.direction === direction,
          );

          return {
            direction,
            overdueLoanCount: directionLoans.length,
            overdueOutstandingRwf: directionLoans.reduce(
              (sum, loan) =>
                sum + this.summarizeLoanBalancesRwf(loan).totalOutstandingRwf,
              0,
            ),
            buckets: bucketNames.map((bucket) =>
              this.buildAgingBucket(
                bucket,
                directionLoans.filter((loan) =>
                  this.isLoanInAgingBucket(loan, bucket, today),
                ),
              ),
            ),
          };
        },
      ),
    };
  }

  async listCurrentUserLoanTransactionIndex(
    userId: string,
    query: LoanReportingQueryDto,
  ): Promise<LoanTransactionWithRecorder[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loans = await this.findReportingLoans(userId, query);
    const dateRange = resolveListDateRange(query);

    return this.filterTransactionsByDateRange(
      loans,
      dateRange?.dateFrom,
      dateRange?.dateTo,
    )
      .map(({ transaction }) => transaction)
      .sort(
        (left, right) =>
          right.date.getTime() - left.date.getTime() ||
          right.createdAt.getTime() - left.createdAt.getTime(),
      );
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
          repaymentAllocation: payload.repaymentAllocation,
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
      payload.repaymentAllocation === undefined &&
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
          repaymentAllocation: payload.repaymentAllocation,
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

    if (
      loan.status === LoanStatus.CANCELLED ||
      loan.status === LoanStatus.WRITTEN_OFF ||
      loan.status === LoanStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Only active loan lifecycle states can be sent into tracked expense flows.',
      );
    }

    if (loan.direction === 'BORROWED') {
      if (loan.status === LoanStatus.SETTLED) {
        throw new BadRequestException(
          'This loan is already settled and cannot be sent to expenses again.',
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const balances = this.summarizeLoanBalances(loan);
        const repaymentAmount = balances.totalOutstanding;
        const repaymentAmountRwf = Number(
          await this.currencyService.convertToRwf(
            repaymentAmount,
            loan.currency,
          ),
        );
        const transaction = await this.loansRepository.createTransaction(
          LoansService.buildLoanTransactionCreateData({
            loanId: loan.id,
            recordedByUserId: userId,
            type: 'REPAYMENT',
            currency: loan.currency,
            date: new Date(payload.date),
            note: payload.note ?? 'Loan settled into expenses',
            amount: repaymentAmount,
            amountRwf: repaymentAmountRwf,
            principalAmount: balances.principalOutstanding,
            principalAmountRwf: Number(
              await this.currencyService.convertToRwf(
                balances.principalOutstanding,
                loan.currency,
              ),
            ),
            interestAmount: balances.interestOutstanding,
            interestAmountRwf: Number(
              await this.currencyService.convertToRwf(
                balances.interestOutstanding,
                loan.currency,
              ),
            ),
            balanceEffect: 'DECREASE',
          }),
          tx,
        );

        const expense = await this.createLinkedExpenseFromTransaction(
          userId,
          loan,
          transaction,
          payload,
          tx,
        );

        const updatedLoan = await this.loansRepository.update(
          loan.id,
          {
            status: LoanStatus.SETTLED,
          },
          tx,
        );

        return {
          loan: updatedLoan,
          expense,
        };
      });
    }

    const firstDisbursement = loan.transactions
      .slice()
      .sort(
        (left, right) =>
          left.date.getTime() - right.date.getTime() ||
          left.createdAt.getTime() - right.createdAt.getTime(),
      )
      .find((transaction) => transaction.type === 'DISBURSEMENT');

    if (firstDisbursement === undefined) {
      throw new BadRequestException(
        'No disbursement transaction exists for this lent loan yet.',
      );
    }

    const disbursement = await this.findTransactionForLoanOrThrow(
      loan,
      firstDisbursement.id,
    );

    if (disbursement.expense !== null) {
      throw new BadRequestException(
        'The lending disbursement for this loan has already been recorded as an expense.',
      );
    }

    const expense = await this.prisma.$transaction((tx) =>
      this.createLinkedExpenseFromTransaction(
        userId,
        loan,
        disbursement,
        payload,
        tx,
      ),
    );

    return {
      loan,
      expense,
    };
  }

  async sendCurrentUserLoanTransactionToExpense(
    userId: string,
    loanId: string,
    transactionId: string,
    payload: LinkLoanTransactionFinancialRecordRequestDto,
  ): Promise<LoanTransactionWithRecorder> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loan = await this.findVisibleLoanOrThrow(userId, loanId);
    const transaction = await this.findTransactionForLoanOrThrow(
      loan,
      transactionId,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.createLinkedExpenseFromTransaction(
        userId,
        loan,
        transaction,
        payload,
        tx,
      );

      return this.loansRepository.findTransactionById(
        transaction.id,
        tx,
      ) as Promise<LoanTransactionWithRecorder>;
    });
  }

  async sendCurrentUserLoanTransactionToIncome(
    userId: string,
    loanId: string,
    transactionId: string,
    payload: LinkLoanTransactionFinancialRecordRequestDto,
  ): Promise<LoanTransactionWithRecorder> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loan = await this.findVisibleLoanOrThrow(userId, loanId);
    const transaction = await this.findTransactionForLoanOrThrow(
      loan,
      transactionId,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.createLinkedIncomeFromTransaction(
        userId,
        loan,
        transaction,
        payload,
        tx,
      );

      return this.loansRepository.findTransactionById(
        transaction.id,
        tx,
      ) as Promise<LoanTransactionWithRecorder>;
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

    if (payload.currency !== loan.currency) {
      throw new BadRequestException(
        'Loan transactions must use the same currency as the loan contract.',
      );
    }

    if (payload.type === LoanTransactionType.REVERSAL) {
      throw new BadRequestException(
        'Use the dedicated reverse transaction endpoint for loan reversals.',
      );
    }

    const transactionDate = new Date(payload.date);
    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException('Transaction date must be valid.');
    }

    const amountRwf = Number(
      await this.currencyService.convertToRwf(payload.amount, payload.currency),
    );
    const allocation = await this.resolveTransactionAllocation(
      loan,
      payload,
      amountRwf,
    );
    const nextStatus = this.resolveStatusAfterLedgerMutation(
      loan,
      payload.type,
      allocation,
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

  async reverseCurrentUserLoanTransaction(
    userId: string,
    loanId: string,
    transactionId: string,
    payload: ReverseLoanTransactionRequestDto,
  ): Promise<LoanTransactionWithRecorder> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const loan = await this.findVisibleLoanOrThrow(userId, loanId);
    const target = await this.findTransactionForLoanOrThrow(
      loan,
      transactionId,
    );

    if (target.type === LoanTransactionType.REVERSAL) {
      throw new BadRequestException(
        'Reversal transactions cannot be reversed directly.',
      );
    }

    if (target.reversalOfTransactionId !== null) {
      throw new BadRequestException(
        'Reversal transactions cannot be reversed directly.',
      );
    }

    if (target.reversals.length > 0) {
      throw new BadRequestException(
        'This loan transaction has already been reversed.',
      );
    }

    const reversalDate = new Date(payload.date);
    if (Number.isNaN(reversalDate.getTime())) {
      throw new BadRequestException('Reversal date must be valid.');
    }

    if (target.income !== null) {
      const allocatedToSavingsRwf =
        await this.savingsRepository.sumDepositSourceAmountRwfByIncomeId(
          target.income.id,
        );

      if (Number(allocatedToSavingsRwf) > 0) {
        throw new BadRequestException(
          'Reverse the savings allocations funded by this loan recovery before reversing the loan transaction.',
        );
      }
    }

    const allocation = {
      principalAmount: Number(target.principalAmount),
      principalAmountRwf: Number(target.principalAmountRwf),
      interestAmount: Number(target.interestAmount),
      interestAmountRwf: Number(target.interestAmountRwf),
      balanceEffect:
        target.balanceEffect === LoanBalanceEffect.INCREASE
          ? LoanBalanceEffect.DECREASE
          : LoanBalanceEffect.INCREASE,
    } as const;
    const nextStatus = this.resolveStatusAfterLedgerMutation(
      loan,
      LoanTransactionType.REVERSAL,
      allocation,
    );

    return this.prisma.$transaction(async (tx) => {
      if (target.expense !== null) {
        await this.expensesRepository.update(
          target.expense.id,
          {
            deletedAt: new Date(),
          },
          tx,
        );
      }

      if (target.income !== null) {
        await this.incomeRepository.update(
          target.income.id,
          {
            deletedAt: new Date(),
          },
          tx,
        );
      }

      await this.loansRepository.updateTransaction(
        target.id,
        {
          expense: target.expense === null ? undefined : { disconnect: true },
          income: target.income === null ? undefined : { disconnect: true },
        },
        tx,
      );

      const reversal = await this.loansRepository.createTransaction(
        LoansService.buildLoanTransactionCreateData({
          loanId: loan.id,
          recordedByUserId: userId,
          type: LoanTransactionType.REVERSAL,
          currency: target.currency,
          date: reversalDate,
          note:
            payload.note ??
            `Reversal of ${target.type.toLowerCase().replace(/_/g, ' ')}`,
          reversalOfTransactionId: target.id,
          amount: Number(target.amount),
          amountRwf: Number(target.amountRwf),
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

      return reversal;
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

  private async findTransactionForLoanOrThrow(
    loan: LoanWithCreator,
    transactionId: string,
  ): Promise<LoanTransactionWithRecorder> {
    const transaction =
      await this.loansRepository.findTransactionById(transactionId);

    if (transaction === null || transaction.loanId !== loan.id) {
      throw new NotFoundException(
        'The requested loan transaction does not exist for this loan.',
      );
    }

    return transaction;
  }

  private async findReportingLoans(
    userId: string,
    query: LoanReportingQueryDto,
  ): Promise<LoanWithCreator[]> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);

    return this.loansRepository.findAllByUserIds(visibleUserIds, {
      search: normalizeListSearch(query.search),
      status: query.status,
      direction: query.direction,
      type: query.type,
    });
  }

  private filterTransactionsByDateRange(
    loans: LoanWithCreator[],
    dateFrom?: Date,
    dateTo?: Date,
  ): Array<{
    loan: LoanWithCreator;
    transaction: LoanTransactionWithRecorder;
  }> {
    return loans.flatMap((loan) =>
      loan.transactions
        .filter((transaction) => {
          if (dateFrom === undefined || dateTo === undefined) {
            return true;
          }

          return (
            transaction.date.getTime() >= dateFrom.getTime() &&
            transaction.date.getTime() < dateTo.getTime()
          );
        })
        .map((transaction) => ({ loan, transaction })),
    );
  }

  private buildLoanAuditSnapshot(
    loans: LoanWithCreator[],
    periodTransactions: Array<{
      loan: LoanWithCreator;
      transaction: LoanTransactionWithRecorder;
    }>,
    period: Pick<LoanAuditResponseDto, 'periodStartDate' | 'periodEndDate'>,
  ): LoanAuditResponseDto {
    const balances = loans.map((loan) => ({
      loan,
      balances: this.summarizeLoanBalancesRwf(loan),
    }));

    return {
      ...period,
      loanCount: loans.length,
      transactionCount: periodTransactions.length,
      reversedTransactionCount: periodTransactions.filter(
        ({ transaction }) =>
          transaction.type === LoanTransactionType.REVERSAL ||
          transaction.reversals.length > 0,
      ).length,
      originalPrincipalRwf: balances.reduce(
        (sum, item) => sum + item.balances.originalPrincipalRwf,
        0,
      ),
      principalRepaidRwf: balances.reduce(
        (sum, item) => sum + item.balances.principalRepaidRwf,
        0,
      ),
      principalOutstandingRwf: balances.reduce(
        (sum, item) => sum + item.balances.principalOutstandingRwf,
        0,
      ),
      interestChargedRwf: balances.reduce(
        (sum, item) => sum + item.balances.interestChargedRwf,
        0,
      ),
      interestPaidRwf: balances.reduce(
        (sum, item) => sum + item.balances.interestPaidRwf,
        0,
      ),
      interestOutstandingRwf: balances.reduce(
        (sum, item) => sum + item.balances.interestOutstandingRwf,
        0,
      ),
      totalOutstandingRwf: balances.reduce(
        (sum, item) => sum + item.balances.totalOutstandingRwf,
        0,
      ),
      linkedExpenseCount: periodTransactions.filter(
        ({ transaction }) =>
          transaction.expense !== null &&
          transaction.expense.deletedAt === null,
      ).length,
      linkedIncomeCount: periodTransactions.filter(
        ({ transaction }) =>
          transaction.income !== null && transaction.income.deletedAt === null,
      ).length,
      unlinkedEligibleTransactionCount: periodTransactions.filter(
        ({ loan, transaction }) =>
          this.canTransactionCreateExpense(loan, transaction) ||
          this.canTransactionCreateIncome(loan, transaction),
      ).length,
      exposureByDirection: [LoanDirection.BORROWED, LoanDirection.LENT].map(
        (direction) => {
          const scoped = balances.filter(
            (item) => item.loan.direction === direction,
          );

          return {
            direction,
            loanCount: scoped.length,
            originalPrincipalRwf: scoped.reduce(
              (sum, item) => sum + item.balances.originalPrincipalRwf,
              0,
            ),
            principalOutstandingRwf: scoped.reduce(
              (sum, item) => sum + item.balances.principalOutstandingRwf,
              0,
            ),
            interestOutstandingRwf: scoped.reduce(
              (sum, item) => sum + item.balances.interestOutstandingRwf,
              0,
            ),
            totalOutstandingRwf: scoped.reduce(
              (sum, item) => sum + item.balances.totalOutstandingRwf,
              0,
            ),
          };
        },
      ),
      statusBreakdown: Object.values(LoanStatus).map((status) => {
        const scoped = balances.filter((item) => item.loan.status === status);

        return {
          status,
          loanCount: scoped.length,
          totalOutstandingRwf: scoped.reduce(
            (sum, item) => sum + item.balances.totalOutstandingRwf,
            0,
          ),
        };
      }),
    };
  }

  private summarizeLoanBalancesRwf(loan: LoanWithCreator): {
    interestChargedRwf: number;
    interestOutstandingRwf: number;
    interestPaidRwf: number;
    originalPrincipalRwf: number;
    principalOutstandingRwf: number;
    principalRepaidRwf: number;
    totalOutstandingRwf: number;
  } {
    const totals = loan.transactions.reduce(
      (accumulator, transaction) => {
        const principalRwf = Number(transaction.principalAmountRwf);
        const interestRwf = Number(transaction.interestAmountRwf);

        if (transaction.balanceEffect === LoanBalanceEffect.INCREASE) {
          accumulator.principalInRwf += principalRwf;
          accumulator.interestInRwf += interestRwf;
        } else {
          accumulator.principalOutRwf += principalRwf;
          accumulator.interestOutRwf += interestRwf;
        }

        return accumulator;
      },
      {
        interestInRwf: 0,
        interestOutRwf: 0,
        principalInRwf: 0,
        principalOutRwf: 0,
      },
    );
    const principalOutstandingRwf = Math.max(
      totals.principalInRwf - totals.principalOutRwf,
      0,
    );
    const interestOutstandingRwf = Math.max(
      totals.interestInRwf - totals.interestOutRwf,
      0,
    );

    return {
      interestChargedRwf: totals.interestInRwf,
      interestOutstandingRwf,
      interestPaidRwf: totals.interestOutRwf,
      originalPrincipalRwf: totals.principalInRwf,
      principalOutstandingRwf,
      principalRepaidRwf: totals.principalOutRwf,
      totalOutstandingRwf: principalOutstandingRwf + interestOutstandingRwf,
    };
  }

  private buildAgingBucket(bucket: string, loans: LoanWithCreator[]) {
    return {
      bucket,
      loanCount: loans.length,
      principalOutstandingRwf: loans.reduce(
        (sum, loan) =>
          sum + this.summarizeLoanBalancesRwf(loan).principalOutstandingRwf,
        0,
      ),
      interestOutstandingRwf: loans.reduce(
        (sum, loan) =>
          sum + this.summarizeLoanBalancesRwf(loan).interestOutstandingRwf,
        0,
      ),
      totalOutstandingRwf: loans.reduce(
        (sum, loan) =>
          sum + this.summarizeLoanBalancesRwf(loan).totalOutstandingRwf,
        0,
      ),
    };
  }

  private isLoanInAgingBucket(
    loan: LoanWithCreator,
    bucket: string,
    asOfDate: Date,
  ): boolean {
    if (loan.dueDate === null) {
      return false;
    }

    const overdueDays = Math.floor(
      (asOfDate.getTime() - loan.dueDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (bucket === '0-30') {
      return overdueDays >= 0 && overdueDays <= 30;
    }

    if (bucket === '31-60') {
      return overdueDays >= 31 && overdueDays <= 60;
    }

    if (bucket === '61-90') {
      return overdueDays >= 61 && overdueDays <= 90;
    }

    return overdueDays > 90;
  }

  private async createLinkedExpenseFromTransaction(
    userId: string,
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
    payload:
      | SendLoanToExpenseRequestDto
      | LinkLoanTransactionFinancialRecordRequestDto,
    tx: Prisma.TransactionClient,
  ): Promise<ExpenseWithCreator> {
    if (
      transaction.reversalOfTransactionId !== null ||
      transaction.reversals.length > 0
    ) {
      throw new BadRequestException(
        'Reversed loan transactions cannot be linked to expenses.',
      );
    }

    if (transaction.expense !== null) {
      throw new BadRequestException(
        'This loan transaction is already linked to an expense record.',
      );
    }

    if (!this.canTransactionCreateExpense(loan, transaction)) {
      throw new BadRequestException(
        'Only loan disbursements you lend out, or outgoing repayment and interest payments on borrowed loans, can be recorded as expenses.',
      );
    }

    const label =
      payload.label ?? this.buildDefaultExpenseLabel(loan, transaction);
    const note = payload.note ?? transaction.note ?? loan.note ?? null;
    const date = new Date(payload.date);

    const expense = await this.expensesRepository.create(
      {
        userId,
        label,
        amount: transaction.amount,
        currency: transaction.currency,
        amountRwf: transaction.amountRwf,
        feeAmount: 0,
        feeAmountRwf: 0,
        totalAmountRwf: transaction.amountRwf,
        category: ExpenseCategory.LOAN,
        date,
        note,
      },
      tx,
    );

    await this.loansRepository.updateTransaction(
      transaction.id,
      {
        expense: {
          connect: {
            id: expense.id,
          },
        },
      },
      tx,
    );

    return expense;
  }

  private async createLinkedIncomeFromTransaction(
    userId: string,
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
    payload: LinkLoanTransactionFinancialRecordRequestDto,
    tx: Prisma.TransactionClient,
  ): Promise<IncomeWithCreator> {
    if (
      transaction.reversalOfTransactionId !== null ||
      transaction.reversals.length > 0
    ) {
      throw new BadRequestException(
        'Reversed loan transactions cannot be linked to income.',
      );
    }

    if (transaction.income !== null) {
      throw new BadRequestException(
        'This loan transaction is already linked to an income record.',
      );
    }

    if (!this.canTransactionCreateIncome(loan, transaction)) {
      throw new BadRequestException(
        'Only repayment and interest receipts on lent loans can be recorded as income.',
      );
    }

    const label =
      payload.label ?? this.buildDefaultIncomeLabel(loan, transaction);
    const date = new Date(payload.date);

    const income = await this.incomeRepository.create(
      {
        userId,
        label,
        amount: transaction.amount,
        currency: transaction.currency,
        amountRwf: transaction.amountRwf,
        category: IncomeCategory.LOAN_RECOVERY,
        date,
        received: true,
      },
      tx,
    );

    await this.loansRepository.updateTransaction(
      transaction.id,
      {
        income: {
          connect: {
            id: income.id,
          },
        },
      },
      tx,
    );

    return income;
  }

  private canTransactionCreateExpense(
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
  ): boolean {
    if (
      transaction.reversalOfTransactionId !== null ||
      transaction.reversals.length > 0
    ) {
      return false;
    }

    return (
      (loan.direction === 'LENT' && transaction.type === 'DISBURSEMENT') ||
      (loan.direction === 'BORROWED' &&
        transaction.balanceEffect === 'DECREASE' &&
        (transaction.type === 'REPAYMENT' ||
          transaction.type === 'INTEREST_PAYMENT'))
    );
  }

  private canTransactionCreateIncome(
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
  ): boolean {
    if (
      transaction.reversalOfTransactionId !== null ||
      transaction.reversals.length > 0
    ) {
      return false;
    }

    return (
      loan.direction === 'LENT' &&
      transaction.balanceEffect === 'DECREASE' &&
      (transaction.type === 'REPAYMENT' ||
        transaction.type === 'INTEREST_PAYMENT')
    );
  }

  private buildDefaultExpenseLabel(
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
  ): string {
    if (loan.direction === 'LENT') {
      return `${loan.label} disbursement`;
    }

    if (transaction.type === 'INTEREST_PAYMENT') {
      return `${loan.label} interest payment`;
    }

    return `${loan.label} repayment`;
  }

  private buildDefaultIncomeLabel(
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
  ): string {
    if (transaction.type === 'INTEREST_PAYMENT') {
      return `${loan.label} interest received`;
    }

    return `${loan.label} repayment received`;
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

  private resolveStatusAfterLedgerMutation(
    loan: LoanWithCreator,
    transactionType: CreateLoanTransactionRequestDto['type'],
    allocation: {
      principalAmount: number;
      principalAmountRwf: number;
      interestAmount: number;
      interestAmountRwf: number;
      balanceEffect: LoanBalanceEffect;
    },
  ): LoanStatus {
    if (transactionType === 'WRITE_OFF') {
      return LoanStatus.WRITTEN_OFF;
    }

    const projectedBalances = this.projectLoanBalances(loan, allocation);

    if (projectedBalances.totalOutstanding <= 0.01) {
      return LoanStatus.SETTLED;
    }

    if (projectedBalances.totalRepaid > 0.01) {
      return this.resolveLifecycleStatus(
        LoanStatus.PARTIALLY_REPAID,
        loan.dueDate,
      );
    }

    return this.resolveLifecycleStatus(LoanStatus.ACTIVE, loan.dueDate);
  }

  private async resolveTransactionAllocation(
    loan: LoanWithCreator,
    payload: CreateLoanTransactionRequestDto,
    amountRwf: number,
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
        return this.resolveRepaymentAllocation(loan, payload);
      case 'INTEREST_CHARGE':
        return {
          principalAmount: 0,
          principalAmountRwf: 0,
          interestAmount: payload.amount,
          interestAmountRwf: amountRwf,
          balanceEffect: 'INCREASE',
        };
      case 'INTEREST_PAYMENT':
        this.assertInterestPaymentAmountWithinOutstanding(loan, payload.amount);
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

  private async resolveRepaymentAllocation(
    loan: LoanWithCreator,
    payload: CreateLoanTransactionRequestDto,
  ): Promise<{
    principalAmount: number;
    principalAmountRwf: number;
    interestAmount: number;
    interestAmountRwf: number;
    balanceEffect: LoanBalanceEffect;
  }> {
    const balances = this.summarizeLoanBalances(loan);
    const outstandingPrincipal = balances.principalOutstanding;
    const outstandingInterest = balances.interestOutstanding;
    const totalOutstanding = balances.totalOutstanding;

    if (totalOutstanding <= 0.01) {
      throw new BadRequestException(
        'This loan has no remaining outstanding balance to repay.',
      );
    }

    if (payload.amount > totalOutstanding + 0.01) {
      throw new BadRequestException(
        'Repayment amount cannot exceed the remaining loan balance.',
      );
    }

    let principalAmount: number;
    let interestAmount: number;

    if (
      payload.principalAmount !== undefined ||
      payload.interestAmount !== undefined
    ) {
      principalAmount =
        payload.principalAmount ??
        payload.amount - (payload.interestAmount ?? 0);
      interestAmount =
        payload.interestAmount ??
        payload.amount - (payload.principalAmount ?? 0);

      if (
        principalAmount < 0 ||
        interestAmount < 0 ||
        Math.abs(principalAmount + interestAmount - payload.amount) > 0.01
      ) {
        throw new BadRequestException(
          'Principal and interest components must add up to the repayment amount.',
        );
      }
    } else if (loan.repaymentAllocation === 'PRINCIPAL_FIRST') {
      principalAmount = Math.min(outstandingPrincipal, payload.amount);
      interestAmount = payload.amount - principalAmount;
    } else {
      interestAmount = Math.min(outstandingInterest, payload.amount);
      principalAmount = payload.amount - interestAmount;
    }

    if (principalAmount > outstandingPrincipal + 0.01) {
      throw new BadRequestException(
        'Repayment principal portion cannot exceed the remaining principal balance.',
      );
    }

    if (interestAmount > outstandingInterest + 0.01) {
      throw new BadRequestException(
        'Repayment interest portion cannot exceed the remaining interest balance.',
      );
    }

    const principalAmountRwf = Number(
      await this.currencyService.convertToRwf(
        principalAmount,
        payload.currency,
      ),
    );
    const interestAmountRwf = Number(
      await this.currencyService.convertToRwf(interestAmount, payload.currency),
    );

    return {
      principalAmount,
      principalAmountRwf,
      interestAmount,
      interestAmountRwf,
      balanceEffect: 'DECREASE',
    };
  }

  private assertInterestPaymentAmountWithinOutstanding(
    loan: LoanWithCreator,
    amount: number,
  ): void {
    const balances = this.summarizeLoanBalances(loan);

    if (balances.interestOutstanding <= 0.01) {
      throw new BadRequestException(
        'This loan has no outstanding interest balance to pay.',
      );
    }

    if (amount > balances.interestOutstanding + 0.01) {
      throw new BadRequestException(
        'Interest payment amount cannot exceed the remaining interest balance.',
      );
    }
  }

  private summarizeLoanBalances(loan: LoanWithCreator): {
    principalOutstanding: number;
    interestOutstanding: number;
    totalOutstanding: number;
    totalRepaid: number;
  } {
    const totals = loan.transactions.reduce(
      (accumulator, transaction) => {
        const principal = Number(transaction.principalAmount);
        const interest = Number(transaction.interestAmount);

        if (transaction.balanceEffect === 'INCREASE') {
          accumulator.principalIn += principal;
          accumulator.interestIn += interest;
        } else {
          accumulator.principalOut += principal;
          accumulator.interestOut += interest;
        }

        return accumulator;
      },
      {
        principalIn: 0,
        principalOut: 0,
        interestIn: 0,
        interestOut: 0,
      },
    );

    const principalOutstanding = Math.max(
      totals.principalIn - totals.principalOut,
      0,
    );
    const interestOutstanding = Math.max(
      totals.interestIn - totals.interestOut,
      0,
    );

    return {
      principalOutstanding,
      interestOutstanding,
      totalOutstanding: principalOutstanding + interestOutstanding,
      totalRepaid: totals.principalOut + totals.interestOut,
    };
  }

  private projectLoanBalances(
    loan: LoanWithCreator,
    allocation: {
      principalAmount: number;
      interestAmount: number;
      balanceEffect: LoanBalanceEffect;
    },
  ): {
    principalOutstanding: number;
    interestOutstanding: number;
    totalOutstanding: number;
    totalRepaid: number;
  } {
    const balances = this.summarizeLoanBalances(loan);

    const principalOutstanding =
      allocation.balanceEffect === 'INCREASE'
        ? balances.principalOutstanding + allocation.principalAmount
        : Math.max(
            balances.principalOutstanding - allocation.principalAmount,
            0,
          );
    const interestOutstanding =
      allocation.balanceEffect === 'INCREASE'
        ? balances.interestOutstanding + allocation.interestAmount
        : Math.max(balances.interestOutstanding - allocation.interestAmount, 0);
    const totalRepaid =
      allocation.balanceEffect === 'DECREASE'
        ? balances.totalRepaid +
          allocation.principalAmount +
          allocation.interestAmount
        : Math.max(
            balances.totalRepaid -
              allocation.principalAmount -
              allocation.interestAmount,
            0,
          );

    return {
      principalOutstanding,
      interestOutstanding,
      totalOutstanding: principalOutstanding + interestOutstanding,
      totalRepaid,
    };
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
