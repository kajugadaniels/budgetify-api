import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Income, Prisma } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';
import { IncomeRepository } from './income.repository';

@Injectable()
export class IncomeService {
  constructor(
    private readonly incomeRepository: IncomeRepository,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserIncome(userId: string): Promise<Income[]> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.incomeRepository.findManyByUserId(userId);
  }

  async createCurrentUserIncome(
    userId: string,
    payload: CreateIncomeRequestDto,
  ): Promise<Income> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.incomeRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      category: payload.category,
      date: new Date(payload.date),
    });
  }

  async updateCurrentUserIncome(
    userId: string,
    incomeId: string,
    payload: UpdateIncomeRequestDto,
  ): Promise<Income> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.category === undefined &&
      payload.date === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one income field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const income = await this.findOwnedIncomeOrThrow(userId, incomeId);

    return this.incomeRepository.update(income.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
      category: payload.category,
      date: payload.date === undefined ? undefined : new Date(payload.date),
    });
  }

  async deleteCurrentUserIncome(
    userId: string,
    incomeId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const income = await this.findOwnedIncomeOrThrow(userId, incomeId);

    await this.incomeRepository.update(income.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedIncomeOrThrow(
    userId: string,
    incomeId: string,
  ): Promise<Income> {
    const income = await this.incomeRepository.findActiveByIdAndUserId(
      incomeId,
      userId,
    );

    if (!income) {
      throw new NotFoundException('Income record was not found.');
    }

    return income;
  }
}
