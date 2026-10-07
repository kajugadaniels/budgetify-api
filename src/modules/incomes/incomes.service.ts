import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Prisma, ReceivedTransactionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateIncomeDto,
  LinkIncomeDto,
  ListIncomesDto,
  ReceiveIncomeDto,
  UpdateIncomeDto,
} from './incomes.dto';

const include = {
  receivedTransaction: { select: { status: true, reference: true } },
} as const;
type IncomeRow = Prisma.IncomeGetPayload<{ include: typeof include }>;
const receivedWhere: Prisma.IncomeWhereInput = {
  received: true,
  OR: [
    { receivedTransactionId: null },
    { receivedTransaction: { status: 'COMPLETED' } },
  ],
};

@Injectable()
export class IncomesService {
  constructor(private readonly prisma: PrismaService) {}

  private response(row: IncomeRow) {
    return {
      id: row.id,
      label: row.label,
      amount: row.amount.toString(),
      currency: row.currency,
      category: row.category,
      date: row.date,
      expectedAt: row.expectedAt,
      receivedAt: row.receivedAt,
      status:
        row.receivedTransaction?.status === 'REVERSED'
          ? 'REVERSED'
          : row.received
            ? 'RECEIVED'
            : 'EXPECTED',
      receivedTransactionId: row.receivedTransactionId,
      paymentReference: row.receivedTransaction?.reference ?? null,
    };
  }

  private async atomic<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2034')
            throw new ConflictException(
              'Income changed during this request. Please try again.',
            );
          if (error.code === 'P2002')
            throw new ConflictException(
              'This request or received payment is already linked to an income record.',
            );
        }
        throw error;
      }
    }
  }

  private async owned(
    tx: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<IncomeRow> {
    const row = await tx.income.findFirst({
      where: { id, userId, deletedAt: null, currency: Currency.RWF },
      include,
    });
    if (!row) throw new NotFoundException('Income record not found.');
    return row;
  }

  private receiptDate(value: string): Date {
    const date = new Date(value);
    if (date > new Date())
      throw new BadRequestException(
        'Received income cannot have a future receipt date.',
      );
    return date;
  }

  async create(userId: string, body: CreateIncomeDto) {
    if (body.received === null)
      throw new BadRequestException('Received must be a boolean.');
    return this.atomic(async (tx) => {
      const existing = await tx.income.findUnique({
        where: {
          userId_clientEventId: { userId, clientEventId: body.clientEventId },
        },
        include,
      });
      if (existing) {
        if (
          existing.deletedAt ||
          existing.label !== body.label ||
          !existing.amount.equals(body.amount) ||
          existing.category !== body.category ||
          existing.date.getTime() !== new Date(body.date).getTime() ||
          existing.received !== body.received
        ) {
          throw new ConflictException(
            'This request ID was already used for a different income record.',
          );
        }
        return this.response(existing);
      }
      const date = body.received
        ? this.receiptDate(body.date)
        : new Date(body.date);
      return this.response(
        await tx.income.create({
          data: {
            userId,
            clientEventId: body.clientEventId,
            label: body.label,
            amount: body.amount,
            amountRwf: body.amount,
            currency: Currency.RWF,
            category: body.category,
            date,
            received: body.received,
            expectedAt: body.received ? null : date,
            receivedAt: body.received ? date : null,
          },
          include,
        }),
      );
    });
  }

  async list(userId: string, query: ListIncomesDto) {
    if (query.from && query.to && new Date(query.from) > new Date(query.to))
      throw new BadRequestException('From date must precede To date.');
    const base: Prisma.IncomeWhereInput = {
      userId,
      deletedAt: null,
      currency: Currency.RWF,
      category: query.category,
      ...(query.search?.trim()
        ? { label: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.from || query.to
        ? {
            date: {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            },
          }
        : {}),
    };
    const status: Prisma.IncomeWhereInput =
      query.status === 'EXPECTED'
        ? { received: false }
        : query.status === 'RECEIVED'
          ? receivedWhere
          : query.status === 'REVERSED'
            ? { receivedTransaction: { status: 'REVERSED' } }
            : {};
    const where = { AND: [base, status] };
    const [items, total, expected, received] = await this.prisma.$transaction(
      [
        this.prisma.income.findMany({
          where,
          include,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.income.count({ where }),
        this.prisma.income.aggregate({
          where: { AND: [base, { received: false }] },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.income.aggregate({
          where: { AND: [base, receivedWhere] },
          _sum: { amount: true },
          _count: true,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: items.map((row) => this.response(row)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasNextPage: query.page * query.limit < total,
      },
      summary: {
        expectedAmount: expected._sum.amount?.toString() ?? '0',
        receivedAmount: received._sum.amount?.toString() ?? '0',
        expectedCount: expected._count,
        receivedCount: received._count,
        currency: 'RWF',
      },
    };
  }

  async update(userId: string, id: string, body: UpdateIncomeDto) {
    if (Object.values(body).some((value) => value === null))
      throw new BadRequestException('Income fields cannot be null.');
    return this.atomic(async (tx) => {
      const row = await this.owned(tx, userId, id);
      if (
        row.received &&
        (body.amount !== undefined || body.date !== undefined)
      )
        throw new ConflictException(
          'Received amounts and dates are locked. Edit the label or category only.',
        );
      return this.response(
        await tx.income.update({
          where: { id },
          data: {
            label: body.label,
            category: body.category,
            ...(body.amount !== undefined
              ? { amount: body.amount, amountRwf: body.amount }
              : {}),
            ...(body.date !== undefined
              ? { date: new Date(body.date), expectedAt: new Date(body.date) }
              : {}),
          },
          include,
        }),
      );
    });
  }

  async receive(userId: string, id: string, body: ReceiveIncomeDto) {
    return this.atomic(async (tx) => {
      const row = await this.owned(tx, userId, id);
      if (row.received) return this.response(row);
      const date = this.receiptDate(body.date);
      return this.response(
        await tx.income.update({
          where: { id },
          data: {
            received: true,
            receivedAt: date,
            date,
            expectedAt: row.expectedAt ?? row.date,
          },
          include,
        }),
      );
    });
  }

  async candidates(userId: string, id: string, query: ListIncomesDto) {
    const row = await this.owned(this.prisma, userId, id);
    if (row.receivedTransactionId) return { items: [], hasNextPage: false };
    if (!row.amount.isInteger() || row.amount.greaterThan(2147483647))
      return { items: [], hasNextPage: false };
    const items = await this.prisma.receivedTransaction.findMany({
      where: {
        userId,
        currency: row.currency,
        amount: Number(row.amount),
        status: ReceivedTransactionStatus.COMPLETED,
        income: null,
        classification: { in: ['UNCLASSIFIED', 'INCOME'] },
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        occurredAt: true,
        senderName: true,
        senderIdentifier: true,
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit + 1,
    });
    return {
      items: items.slice(0, query.limit),
      hasNextPage: items.length > query.limit,
    };
  }

  async link(userId: string, id: string, body: LinkIncomeDto) {
    return this.atomic(async (tx) => {
      const row = await this.owned(tx, userId, id);
      if (row.receivedTransactionId === body.receivedTransactionId)
        return this.response(row);
      if (row.receivedTransactionId)
        throw new ConflictException(
          'This income already has a linked payment.',
        );
      const payment = await tx.receivedTransaction.findFirst({
        where: { id: body.receivedTransactionId, userId },
        include: { income: true },
      });
      if (!payment) throw new NotFoundException('Received payment not found.');
      if (
        payment.income ||
        payment.status !== 'COMPLETED' ||
        payment.currency !== row.currency ||
        !row.amount.equals(payment.amount) ||
        !['UNCLASSIFIED', 'INCOME'].includes(payment.classification)
      ) {
        throw new ConflictException(
          'Choose an unlinked completed payment with the same amount and currency, classified as income or unclassified.',
        );
      }
      await tx.receivedTransaction.update({
        where: { id: payment.id },
        data: { classification: 'INCOME' },
      });
      return this.response(
        await tx.income.update({
          where: { id },
          data: {
            receivedTransactionId: payment.id,
            received: true,
            receivedAt: payment.occurredAt,
            date: payment.occurredAt,
            expectedAt: row.expectedAt ?? (row.received ? null : row.date),
          },
          include,
        }),
      );
    });
  }

  async archive(userId: string, id: string) {
    await this.atomic(async (tx) => {
      await this.owned(tx, userId, id);
      await tx.income.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
    return { archived: true };
  }
}
