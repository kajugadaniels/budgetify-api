import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Saving } from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import { UsersService } from '../users/users.service';
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { ListSavingsQueryDto } from './dto/list-savings.query.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';
import { SavingsRepository } from './savings.repository';

@Injectable()
export class SavingsService {
  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserSavings(
    userId: string,
    query: ListSavingsQueryDto,
  ): Promise<PaginatedResponse<Saving>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const pagination = resolvePaginationOptions(query);

    const dateRange =
      query.month === undefined && query.year === undefined
        ? undefined
        : this.buildSavingMonthRange(query);

    return this.savingsRepository.findManyByUserId(userId, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  async createCurrentUserSaving(
    userId: string,
    payload: CreateSavingRequestDto,
  ): Promise<Saving> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.savingsRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      date: new Date(payload.date),
      note: payload.note ?? null,
      stillHave: payload.stillHave,
    });
  }

  async updateCurrentUserSaving(
    userId: string,
    savingId: string,
    payload: UpdateSavingRequestDto,
  ): Promise<Saving> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.date === undefined &&
      payload.note === undefined &&
      payload.stillHave === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one saving field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findOwnedSavingOrThrow(userId, savingId);

    return this.savingsRepository.update(saving.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
      date: payload.date === undefined ? undefined : new Date(payload.date),
      note: payload.note,
      stillHave: payload.stillHave,
    });
  }

  async deleteCurrentUserSaving(
    userId: string,
    savingId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findOwnedSavingOrThrow(userId, savingId);

    await this.savingsRepository.update(saving.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedSavingOrThrow(
    userId: string,
    savingId: string,
  ): Promise<Saving> {
    const saving = await this.savingsRepository.findActiveByIdAndUserId(
      savingId,
      userId,
    );

    if (!saving) {
      throw new NotFoundException('Saving record was not found.');
    }

    return saving;
  }

  private buildSavingMonthRange(query: ListSavingsQueryDto): {
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
