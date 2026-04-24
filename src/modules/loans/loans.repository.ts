import { Injectable } from '@nestjs/common';
import { LoanDirection, LoanStatus, LoanType, Prisma } from '@prisma/client';

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

export type LoanWithCreator = Prisma.LoanGetPayload<{
  include: { user: { select: typeof USER_SELECT } };
}>;

@Injectable()
export class LoansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      status?: LoanStatus;
      direction?: LoanDirection;
      type?: LoanType;
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<LoanWithCreator>> {
    const searchFilters: Prisma.LoanWhereInput[] =
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

    const where: Prisma.LoanWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
      status: options?.status,
      direction: options?.direction,
      type: options?.type,
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
      db.loan.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.loan.count({ where }),
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
  ): Promise<LoanWithCreator | null> {
    return this.findActiveByIdAndUserIds(id, [userId], db);
  }

  async findActiveByIdAndUserIds(
    id: string,
    userIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<LoanWithCreator | null> {
    return db.loan.findFirst({
      where: {
        id,
        userId: { in: userIds },
        deletedAt: null,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async create(
    data: Prisma.LoanUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<LoanWithCreator> {
    return db.loan.create({
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  async update(
    id: string,
    data: Prisma.LoanUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<LoanWithCreator> {
    return db.loan.update({
      where: { id },
      data,
      include: { user: { select: USER_SELECT } },
    });
  }
}
