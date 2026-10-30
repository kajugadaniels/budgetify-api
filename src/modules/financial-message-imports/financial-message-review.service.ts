import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  FinancialMessageDirection,
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
  IncomeCategory,
  Prisma,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';
import type { FinancialMessageImport } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import {
  assertReceivedOccurrenceTime,
  assertReceivedSenderPresent,
  createReceivedTransactionReference,
  normalizeReceivedSenderIdentifier,
} from '../received-transactions/policies/received-transaction-recording.policy';
import { FinancialMessageCryptoService } from './financial-message-crypto.service';
import { FinancialMessageImportMapper } from './financial-message-import.mapper';
import {
  ConfirmFinancialMessageImportDto,
  FinancialMessageImportConfirmationResponseDto,
  FinancialMessageImportDetailResponseDto,
  FinancialMessageImportListResponseDto,
  ListFinancialMessageImportsQueryDto,
  UpdateFinancialMessageImportDto,
} from './financial-message-review.dto';

const MAX_TRANSACTION_ATTEMPTS = 3;
const MAX_RECEIVED_AMOUNT = 2_147_483_647;
const confirmationInclude = {
  confirmedReceivedTransaction: {
    select: { id: true, classification: true, note: true },
  },
  confirmedIncome: { select: { id: true, category: true, label: true } },
} as const;
type ConfirmationImport = Prisma.FinancialMessageImportGetPayload<{
  include: typeof confirmationInclude;
}>;

@Injectable()
export class FinancialMessageReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FinancialMessageCryptoService,
  ) {}

  async list(
    userId: string,
    query: ListFinancialMessageImportsQueryDto,
  ): Promise<FinancialMessageImportListResponseDto> {
    await this.expirePending(userId);

    const where: Prisma.FinancialMessageImportWhereInput = {
      userId,
      status: query.status,
      parseStatus: query.parseStatus,
    };
    const [items, total, pendingCount] = await this.prisma.$transaction(
      [
        this.prisma.financialMessageImport.findMany({
          where,
          orderBy: [{ messageReceivedAt: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.financialMessageImport.count({ where }),
        this.prisma.financialMessageImport.count({
          where: { userId, status: FinancialMessageImportStatus.PENDING },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return {
      items: items.map((item) => FinancialMessageImportMapper.toResponse(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        hasNextPage: query.page * query.limit < total,
      },
      pendingCount,
    };
  }

  async detail(
    userId: string,
    id: string,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    await this.expireOne(userId, id);
    const row = await this.findOwned(this.prisma, userId, id);

    return this.toDetail(row);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateFinancialMessageImportDto,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    if (Object.values(body).every((value) => value === undefined)) {
      throw new BadRequestException('Provide at least one detail to update.');
    }

    await this.expireOne(userId, id);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const existing = await this.findOwned(tx, userId, id);
        this.assertPending(existing);

        const amount = body.amount ?? existing.amount?.toNumber() ?? null;
        const occurredAt = body.occurredAt
          ? new Date(body.occurredAt)
          : existing.occurredAt;
        const senderName = body.senderName ?? existing.senderName;
        const senderIdentifier =
          body.senderIdentifier ?? existing.senderIdentifier;
        const isComplete =
          amount !== null &&
          occurredAt !== null &&
          Boolean(senderName || senderIdentifier);

        if (occurredAt) {
          assertReceivedOccurrenceTime(occurredAt);
        }

        return tx.financialMessageImport.update({
          where: { id: existing.id },
          data: {
            amount: body.amount,
            currency: body.amount === undefined ? undefined : Currency.RWF,
            occurredAt: body.occurredAt ? occurredAt : undefined,
            senderName: body.senderName,
            senderIdentifier: body.senderIdentifier
              ? normalizeReceivedSenderIdentifier(body.senderIdentifier)
              : undefined,
            providerReference: body.providerReference,
            parseStatus: isComplete
              ? FinancialMessageParseStatus.PARSED
              : FinancialMessageParseStatus.NEEDS_DETAILS,
          },
        });
      });

      return this.toDetail(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'That provider reference is already assigned to another imported message.',
        );
      }

      throw error;
    }
  }

  async confirm(
    userId: string,
    id: string,
    body: ConfirmFinancialMessageImportDto,
  ): Promise<FinancialMessageImportConfirmationResponseDto> {
    this.assertIncomeRequest(body);
    await this.expireOne(userId, id);

    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const imported = await this.findOwnedForConfirmation(
              tx,
              userId,
              id,
            );

            if (imported.status === FinancialMessageImportStatus.CONFIRMED) {
              return this.confirmedReplay(imported, body);
            }

            this.assertPending(imported);
            const amount = this.receivedAmount(imported);
            const occurredAt = imported.occurredAt;

            if (!occurredAt) {
              throw new BadRequestException(
                'Add the payment date before confirming this import.',
              );
            }

            assertReceivedOccurrenceTime(occurredAt);
            assertReceivedSenderPresent(
              imported.senderIdentifier ?? undefined,
              imported.senderName ?? undefined,
              'Add a sender name or phone number before confirming this import.',
            );

            if (
              imported.duplicateStatus ===
              FinancialMessageDuplicateStatus.CONFIRMED_DUPLICATE
            ) {
              throw new ConflictException(
                'This message duplicates an existing import and cannot be confirmed.',
              );
            }

            const received = await tx.receivedTransaction.create({
              data: {
                userId,
                reference: createReceivedTransactionReference(),
                clientEventId: `financial-message-import:${imported.id}`,
                status: ReceivedTransactionStatus.COMPLETED,
                classification: body.classification,
                evidenceSource: ReceivedTransactionEvidenceSource.PROVIDER_SMS,
                currency: Currency.RWF,
                amount,
                senderIdentifier: normalizeReceivedSenderIdentifier(
                  imported.senderIdentifier ?? undefined,
                ),
                senderName: imported.senderName,
                providerReference: imported.providerReference,
                occurredAt,
                reversedAt: null,
                note: body.note ?? null,
              },
            });

            const income = body.createIncome
              ? await tx.income.create({
                  data: {
                    userId,
                    clientEventId: `financial-message-income:${imported.id}`,
                    label: body.incomeLabel as string,
                    amount,
                    amountRwf: amount,
                    currency: Currency.RWF,
                    category: body.incomeCategory as IncomeCategory,
                    date: occurredAt,
                    received: true,
                    expectedAt: null,
                    receivedAt: occurredAt,
                    receivedTransactionId: received.id,
                  },
                })
              : null;

            const confirmed = await tx.financialMessageImport.update({
              where: { id: imported.id },
              data: {
                direction: FinancialMessageDirection.CREDIT,
                parseStatus: FinancialMessageParseStatus.PARSED,
                status: FinancialMessageImportStatus.CONFIRMED,
                duplicateStatus: FinancialMessageDuplicateStatus.CLEAR,
                confirmedReceivedTransactionId: received.id,
                confirmedIncomeId: income?.id ?? null,
                confirmedAt: new Date(),
                rawMessageCiphertext: null,
                rawMessagePurgedAt: new Date(),
              },
            });

            return {
              import: FinancialMessageImportMapper.toResponse(confirmed),
              receivedTransactionId: received.id,
              incomeId: income?.id ?? null,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < MAX_TRANSACTION_ATTEMPTS - 1
        ) {
          continue;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')
        ) {
          throw new ConflictException(
            'This imported payment was already recorded or changed. Refresh and try again.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'This imported payment could not be confirmed safely. Refresh and try again.',
    );
  }

  async dismiss(
    userId: string,
    id: string,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    await this.expireOne(userId, id);

    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await this.findOwned(tx, userId, id);

      if (existing.status === FinancialMessageImportStatus.DISMISSED) {
        return existing;
      }

      this.assertPending(existing);

      return tx.financialMessageImport.update({
        where: { id: existing.id },
        data: {
          status: FinancialMessageImportStatus.DISMISSED,
          dismissedAt: new Date(),
          rawMessageCiphertext: null,
          rawMessagePurgedAt: new Date(),
        },
      });
    });

    return this.toDetail(row);
  }

  private async expirePending(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.financialMessageImport.updateMany({
      where: {
        userId,
        status: FinancialMessageImportStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: FinancialMessageImportStatus.EXPIRED,
        rawMessageCiphertext: null,
        rawMessagePurgedAt: now,
      },
    });
  }

  private async expireOne(userId: string, id: string): Promise<void> {
    const now = new Date();
    await this.prisma.financialMessageImport.updateMany({
      where: {
        id,
        userId,
        status: FinancialMessageImportStatus.PENDING,
        expiresAt: { lte: now },
      },
      data: {
        status: FinancialMessageImportStatus.EXPIRED,
        rawMessageCiphertext: null,
        rawMessagePurgedAt: now,
      },
    });
  }

  private async findOwned(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    id: string,
  ) {
    const row = await tx.financialMessageImport.findFirst({
      where: { id, userId },
    });

    if (!row) {
      throw new NotFoundException('The imported message was not found.');
    }

    return row;
  }

  private async findOwnedForConfirmation(
    tx: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<ConfirmationImport> {
    const row = await tx.financialMessageImport.findFirst({
      where: { id, userId },
      include: confirmationInclude,
    });

    if (!row) {
      throw new NotFoundException('The imported message was not found.');
    }

    return row;
  }

  private assertPending(row: {
    status: FinancialMessageImportStatus;
  }): void {
    if (row.status === FinancialMessageImportStatus.EXPIRED) {
      throw new GoneException('This imported message has expired.');
    }

    if (row.status !== FinancialMessageImportStatus.PENDING) {
      throw new ConflictException(
        'Only pending imported messages can be changed.',
      );
    }
  }

  private receivedAmount(imported: ConfirmationImport): number {
    if (!imported.amount || imported.currency !== Currency.RWF) {
      throw new BadRequestException(
        'Add a valid RWF amount before confirming this import.',
      );
    }

    const amount = imported.amount.toNumber();

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > MAX_RECEIVED_AMOUNT
    ) {
      throw new BadRequestException(
        'The received amount must be a whole RWF value within the supported range.',
      );
    }

    return amount;
  }

  private assertIncomeRequest(body: ConfirmFinancialMessageImportDto): void {
    if (!body.createIncome) {
      if (body.incomeCategory || body.incomeLabel) {
        throw new BadRequestException(
          'Income details require createIncome to be enabled.',
        );
      }
      return;
    }

    if (body.classification !== ReceivedTransactionClassification.INCOME) {
      throw new BadRequestException(
        'Only a payment classified as income can create an income record.',
      );
    }

    if (!body.incomeCategory || !body.incomeLabel) {
      throw new BadRequestException(
        'Income category and label are required when creating income.',
      );
    }
  }

  private confirmedReplay(
    imported: ConfirmationImport,
    body: ConfirmFinancialMessageImportDto,
  ): FinancialMessageImportConfirmationResponseDto {
    const received = imported.confirmedReceivedTransaction;

    if (
      !received ||
      received.classification !== body.classification ||
      received.note !== (body.note ?? null) ||
      Boolean(imported.confirmedIncome) !== body.createIncome ||
      (body.createIncome &&
        (imported.confirmedIncome?.category !== body.incomeCategory ||
          imported.confirmedIncome?.label !== body.incomeLabel))
    ) {
      throw new ConflictException(
        'This import was already confirmed with different choices.',
      );
    }

    return {
      import: FinancialMessageImportMapper.toResponse(imported),
      receivedTransactionId: received.id,
      incomeId: imported.confirmedIncome?.id ?? null,
    };
  }

  private toDetail(
    row: FinancialMessageImport,
  ): FinancialMessageImportDetailResponseDto {
    return {
      ...FinancialMessageImportMapper.toResponse(row),
      rawMessage: row.rawMessageCiphertext
        ? this.crypto.decrypt(row.rawMessageCiphertext)
        : null,
    };
  }
}
