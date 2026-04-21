import { Injectable } from '@nestjs/common';
import { IncomeCategory, Prisma } from '@prisma/client';

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

export type IncomeWithCreator = Prisma.IncomeGetPayload<{
  include: { user: { select: typeof USER_SELECT } };
}>;

export interface IncomeAllocationCandidate {
  id: string;
  amountRwf: Prisma.Decimal;
}

export interface IncomeSummaryAggregate {
  totalAmountRwf: number;
  receivedAmountRwf: number;
  totalCount: number;
  receivedCount: number;
}

@Injectable()
export class IncomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      searchCategories?: IncomeCategory[];
      incomeIds?: string[];
      category?: Prisma.IncomeWhereInput['category'];
      received?: boolean;
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<IncomeWithCreator>> {
    const searchFilters: Prisma.IncomeWhereInput[] = [];

    if (options?.search) {
      searchFilters.push({
        label: {
          contains: options.search,
          mode: 'insensitive',
        },
      });

      if (options.searchCategories && options.searchCategories.length > 0) {
        searchFilters.push({
          category: {
            in: options.searchCategories,
          },
        });
      }
    }

    const where: Prisma.IncomeWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
      id:
        options?.incomeIds === undefined
          ? undefined
          : {
              in: options.incomeIds,
            },
      category: options?.category,
      received: options?.received,
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
      db.income.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.income.count({ where }),
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
  ): Promise<IncomeWithCreator | null> {
    return this.findActiveByIdAndUserIds(id, [userId], db);
  }

  async findActiveByIdAndUserIds(
    id: string,
    userIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<IncomeWithCreator | null> {
    return db.income.findFirst({
      where: {
        id,
        userId: { in: userIds },
        deletedAt: null,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async create(
    data: Prisma.IncomeUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<IncomeWithCreator> {
    return db.income.create({
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  async update(
    id: string,
    data: Prisma.IncomeUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<IncomeWithCreator> {
    return db.income.update({
      where: { id },
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  async findAllocationCandidatesByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      searchCategories?: IncomeCategory[];
      category?: Prisma.IncomeWhereInput['category'];
      received?: boolean;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<IncomeAllocationCandidate[]> {
    const searchFilters: Prisma.IncomeWhereInput[] = [];

    if (options?.search) {
      searchFilters.push({
        label: {
          contains: options.search,
          mode: 'insensitive',
        },
      });

      if (options.searchCategories && options.searchCategories.length > 0) {
        searchFilters.push({
          category: {
            in: options.searchCategories,
          },
        });
      }
    }

    return db.income.findMany({
      where: {
        userId: { in: userIds },
        deletedAt: null,
        category: options?.category,
        received: options?.received,
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
      },
      select: {
        id: true,
        amountRwf: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async summarizeByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<IncomeSummaryAggregate> {
    const where: Prisma.IncomeWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
      date:
        options?.dateFrom && options?.dateTo
          ? {
              gte: options.dateFrom,
              lt: options.dateTo,
            }
          : undefined,
    };

    const groups = await db.income.groupBy({
      by: ['received'],
      where,
      _sum: { amountRwf: true },
      _count: { _all: true },
    });

    return groups.reduce<IncomeSummaryAggregate>(
      (summary, group) => {
        const amount = Number(group._sum.amountRwf ?? 0);
        const count = group._count._all;

        summary.totalAmountRwf += amount;
        summary.totalCount += count;

        if (group.received) {
          summary.receivedAmountRwf += amount;
          summary.receivedCount += count;
        }

        return summary;
      },
      {
        totalAmountRwf: 0,
        receivedAmountRwf: 0,
        totalCount: 0,
        receivedCount: 0,
      },
    );
  }
}
