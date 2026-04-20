import { Injectable } from '@nestjs/common';
import { Prisma, SavingTransactionType } from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

const SAVING_WITH_LEDGER_ARGS = Prisma.validator<Prisma.SavingDefaultArgs>()({
  include: {
    user: { select: USER_SELECT },
    transactions: {
      where: { deletedAt: null },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    },
  },
});

export type SavingWithCreator = Prisma.SavingGetPayload<
  typeof SAVING_WITH_LEDGER_ARGS
>;

@Injectable()
export class SavingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    callback: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(callback);
  }

  async findManyByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<SavingWithCreator>> {
    const searchFilters: Prisma.SavingWhereInput[] =
      options?.search === undefined
        ? []
        : [
            {
              label: {
                contains: options.search,
                mode: 'insensitive',
              },
            },
            {
              note: {
                contains: options.search,
                mode: 'insensitive',
              },
            },
          ];

    const where: Prisma.SavingWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
      AND:
        searchFilters.length > 0
          ? [
              {
                OR: searchFilters,
              },
            ]
          : undefined,
      date:
        options?.dateFrom && options?.dateTo
          ? {
              gte: options.dateFrom,
              lt: options.dateTo,
            }
          : undefined,
    };

    const [items, totalItems] = await Promise.all([
      db.saving.findMany({
        where,
        ...SAVING_WITH_LEDGER_ARGS,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.saving.count({ where }),
    ]);

    return createPaginatedResponse(items, totalItems, {
      page: options?.page ?? 1,
      limit: options?.limit ?? Math.max(items.length, 1),
    });
  }

  async findActiveByIdAndUserId(
    id: string,
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<SavingWithCreator | null> {
    return this.findActiveByIdAndUserIds(id, [userId], db);
  }

  async findActiveByIdAndUserIds(
    id: string,
    userIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<SavingWithCreator | null> {
    return db.saving.findFirst({
      ...SAVING_WITH_LEDGER_ARGS,
      where: {
        id,
        userId: { in: userIds },
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.SavingUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<SavingWithCreator> {
    return db.saving.create({
      data,
      ...SAVING_WITH_LEDGER_ARGS,
    });
  }

  async update(
    id: string,
    data: Prisma.SavingUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<SavingWithCreator> {
    return db.saving.update({
      where: { id },
      data,
      ...SAVING_WITH_LEDGER_ARGS,
    });
  }

  async createTransaction(
    data: Prisma.SavingTransactionUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await db.savingTransaction.create({ data });
  }

  async syncPrimaryDeposit(
    saving: SavingWithCreator,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    const primaryDeposit = await db.savingTransaction.findFirst({
      where: {
        savingId: saving.id,
        type: SavingTransactionType.DEPOSIT,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const data = {
      userId: saving.userId,
      type: SavingTransactionType.DEPOSIT,
      amount: saving.amount,
      currency: saving.currency,
      amountRwf: saving.amountRwf,
      date: saving.date,
      note: saving.note,
    };

    if (!primaryDeposit) {
      await db.savingTransaction.create({
        data: {
          savingId: saving.id,
          ...data,
        },
      });

      return;
    }

    await db.savingTransaction.update({
      where: { id: primaryDeposit.id },
      data,
    });
  }

  async syncLegacyAvailabilityWithdrawal(
    saving: SavingWithCreator,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    if (saving.stillHave) {
      await db.savingTransaction.updateMany({
        where: {
          savingId: saving.id,
          type: SavingTransactionType.WITHDRAWAL,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      return;
    }

    const withdrawal = await db.savingTransaction.findFirst({
      where: {
        savingId: saving.id,
        type: SavingTransactionType.WITHDRAWAL,
        deletedAt: null,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const data = {
      userId: saving.userId,
      type: SavingTransactionType.WITHDRAWAL,
      amount: saving.amount,
      currency: saving.currency,
      amountRwf: saving.amountRwf,
      date: saving.date,
      note:
        saving.note === null
          ? 'Legacy withdrawal from inactive saving'
          : `${saving.note} - Legacy withdrawal from inactive saving`,
    };

    if (!withdrawal) {
      await db.savingTransaction.create({
        data: {
          savingId: saving.id,
          ...data,
        },
      });

      return;
    }

    await db.savingTransaction.update({
      where: { id: withdrawal.id },
      data,
    });
  }
}
