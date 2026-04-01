import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Expense, ExpenseCategory, Loan, Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { UsersService } from '../users/users.service';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import { LoansRepository } from './loans.repository';

@Injectable()
export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserLoans(
    userId: string,
    query: ListLoansQueryDto,
  ): Promise<PaginatedResponse<Loan>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const pagination = resolvePaginationOptions(query);

    const dateRange =
      query.month === undefined && query.year === undefined
        ? undefined
        : this.buildLoanMonthRange(query);

    return this.loansRepository.findManyByUserId(userId, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      paid: query.paid,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  async createCurrentUserLoan(
    userId: string,
    payload: CreateLoanRequestDto,
  ): Promise<Loan> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.loansRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      date: new Date(payload.date),
      paid: payload.paid,
      note: payload.note ?? null,
    });
  }

  async updateCurrentUserLoan(
    userId: string,
    loanId: string,
    payload: UpdateLoanRequestDto,
  ): Promise<Loan> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.date === undefined &&
      payload.paid === undefined &&
      payload.note === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one loan field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const loan = await this.findOwnedLoanOrThrow(userId, loanId);

    return this.loansRepository.update(loan.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
      date: payload.date === undefined ? undefined : new Date(payload.date),
      paid: payload.paid,
      note: payload.note,
    });
  }

  async sendCurrentUserLoanToExpense(
    userId: string,
    loanId: string,
    payload: SendLoanToExpenseRequestDto,
  ): Promise<{ loan: Loan; expense: Expense }> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const loan = await this.findOwnedLoanOrThrow(userId, loanId);

    if (loan.paid) {
      throw new BadRequestException(
        'This loan is already marked as paid and cannot be sent to expenses again.',
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
          paid: true,
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
  ): Promise<Loan> {
    const loan = await this.loansRepository.findActiveByIdAndUserId(
      loanId,
      userId,
    );

    if (!loan) {
      throw new NotFoundException('Loan record was not found.');
    }

    return loan;
  }

  private buildLoanMonthRange(query: ListLoansQueryDto): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const now = new Date();
    const resolvedYear = query.year ?? now.getUTCFullYear();
    const resolvedMonthIndex = (query.month ?? now.getUTCMonth() + 1) - 1;

    return {
      dateFrom: new Date(Date.UTC(resolvedYear, resolvedMonthIndex, 1)),
      dateTo: new Date(Date.UTC(resolvedYear, resolvedMonthIndex + 1, 1)),
    };
  }
}
