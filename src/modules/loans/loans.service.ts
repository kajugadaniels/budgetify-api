import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Loan, Prisma } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import { LoansRepository } from './loans.repository';

@Injectable()
export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserLoans(
    userId: string,
    query: ListLoansQueryDto,
  ): Promise<Loan[]> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const { dateFrom, dateTo } = this.buildLoanMonthRange(query);

    return this.loansRepository.findManyByUserId(userId, {
      dateFrom,
      dateTo,
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
