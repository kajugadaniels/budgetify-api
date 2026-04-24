import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseCategory, LoanStatus, Prisma } from '@prisma/client';

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
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import { LoanWithCreator, LoansRepository } from './loans.repository';

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
    const amountRwf = await this.currencyService.convertToRwf(
      payload.amount,
      payload.currency,
    );

    return this.loansRepository.create({
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
      ? await this.currencyService.convertToRwf(
          payload.amount ?? Number(loan.amount),
          nextCurrency,
        )
      : undefined;

    return this.loansRepository.update(loan.id, {
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

      return {
        loan: updatedLoan,
        expense,
      };
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
}
