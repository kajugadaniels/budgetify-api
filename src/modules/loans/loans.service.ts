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
import { UsersService } from '../users/users.service';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { CreateLoanTransactionRequestDto } from './dto/create-loan-transaction.request.dto';
import { LinkLoanTransactionFinancialRecordRequestDto } from './dto/link-loan-transaction-financial-record.request.dto';
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
    private readonly incomeRepository: IncomeRepository,
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
      loan,
      payload,
      amountRwf,
      reversalTarget,
    );
    const nextStatus = this.resolveStatusAfterTransaction(
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

  private async createLinkedExpenseFromTransaction(
    userId: string,
    loan: LoanWithCreator,
    transaction: LoanTransactionWithRecorder,
    payload:
      | SendLoanToExpenseRequestDto
      | LinkLoanTransactionFinancialRecordRequestDto,
    tx: Prisma.TransactionClient,
  ): Promise<ExpenseWithCreator> {
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

  private resolveStatusAfterTransaction(
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

    if (allocation.balanceEffect === 'DECREASE') {
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

    return {
      principalOutstanding,
      interestOutstanding,
      totalOutstanding: principalOutstanding + interestOutstanding,
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
