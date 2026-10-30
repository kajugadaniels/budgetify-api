import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  FinancialMessageChannel,
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  Prisma,
} from '@prisma/client';
import type { FinancialMessageImport } from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessageCryptoService } from './financial-message-crypto.service';
import {
  CreateFinancialMessageImportDto,
  FinancialMessageImportResponseDto,
} from './financial-message-import.dto';
import { FinancialMessageImportMapper } from './financial-message-import.mapper';
import { FinancialMessagePilotService } from './financial-message-pilot.service';
import { FinancialMessageParserService } from './financial-message-parser.service';
import { FinancialMessageRolloutService } from './financial-message-rollout.service';
import type { AuthenticatedShortcutCredential } from './shortcut-import-auth.types';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const FUTURE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const DUPLICATE_LOOKBACK_DAYS = 7;
const MAX_TRANSACTION_ATTEMPTS = 3;

@Injectable()
export class FinancialMessageImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: FinancialMessageParserService,
    private readonly crypto: FinancialMessageCryptoService,
    private readonly rollout: FinancialMessageRolloutService,
    private readonly pilot: FinancialMessagePilotService,
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  async ingest(
    credential: AuthenticatedShortcutCredential,
    body: CreateFinancialMessageImportDto,
  ): Promise<FinancialMessageImportResponseDto> {
    this.rollout.assertIngestionEnabled();
    const now = new Date();
    const messageReceivedAt = new Date(body.messageReceivedAt);
    this.assertMessageTime(messageReceivedAt, now);

    const fingerprint = this.crypto.fingerprint(body.message);
    const encryptedMessage = this.crypto.encrypt(body.message);
    const parsed = this.rollout.applyProviderRollout(
      this.parser.parse({
        message: body.message,
        messageSender: body.messageSender,
        messageReceivedAt,
      }),
    );

    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        const result = await this.prisma.$transaction(
          async (tx) => {
            const existingByEvent = await tx.financialMessageImport.findUnique({
              where: {
                userId_clientEventId: {
                  userId: credential.userId,
                  clientEventId: body.clientEventId,
                },
              },
            });

            if (existingByEvent) {
              this.assertReplayMatches(
                existingByEvent,
                body,
                fingerprint,
                messageReceivedAt,
              );

              return FinancialMessageImportMapper.toResponse(
                existingByEvent,
                true,
              );
            }

            const existingByProviderReference =
              parsed.providerCode && parsed.providerReference
                ? await tx.financialMessageImport.findFirst({
                    where: {
                      userId: credential.userId,
                      providerCode: parsed.providerCode,
                      providerReference: parsed.providerReference,
                    },
                  })
                : null;

            if (existingByProviderReference) {
              const duplicate =
                existingByProviderReference.duplicateStatus ===
                FinancialMessageDuplicateStatus.CONFIRMED_DUPLICATE
                  ? existingByProviderReference
                  : await tx.financialMessageImport.update({
                      where: { id: existingByProviderReference.id },
                      data: {
                        duplicateStatus:
                          FinancialMessageDuplicateStatus.CONFIRMED_DUPLICATE,
                      },
                    });

              return FinancialMessageImportMapper.toResponse(duplicate);
            }

            const possibleDuplicate = await tx.financialMessageImport.findFirst(
              {
                where: {
                  userId: credential.userId,
                  fingerprint,
                  createdAt: {
                    gte: new Date(
                      now.getTime() -
                        DUPLICATE_LOOKBACK_DAYS * MILLISECONDS_PER_DAY,
                    ),
                  },
                },
                select: { id: true },
              },
            );

            const created = await tx.financialMessageImport.create({
              data: {
                userId: credential.userId,
                credentialId: credential.id,
                clientEventId: body.clientEventId,
                sourceHint: body.sourceHint,
                providerCode: parsed.providerCode,
                channel: FinancialMessageChannel.SMS,
                direction: parsed.direction,
                parseStatus: parsed.parseStatus,
                status: FinancialMessageImportStatus.PENDING,
                duplicateStatus: possibleDuplicate
                  ? FinancialMessageDuplicateStatus.POSSIBLE_DUPLICATE
                  : FinancialMessageDuplicateStatus.CLEAR,
                currency: parsed.currency,
                amount: parsed.amount,
                fee: parsed.fee,
                messageReceivedAt,
                occurredAt: parsed.occurredAt,
                senderName: parsed.senderName,
                senderIdentifier: parsed.senderIdentifier,
                accountLastFour: parsed.accountLastFour,
                providerReference: parsed.providerReference,
                fingerprint,
                parserVersion: parsed.parserVersion,
                parseConfidence: parsed.parseConfidence,
                rawMessageCiphertext: encryptedMessage,
                expiresAt: new Date(
                  now.getTime() +
                    this.config.pendingImportLifetimeDays *
                      MILLISECONDS_PER_DAY,
                ),
              },
            });

            return FinancialMessageImportMapper.toResponse(created);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        this.pilot.recordOutcome(result);
        return result;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034') &&
          attempt < MAX_TRANSACTION_ATTEMPTS - 1
        ) {
          continue;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')
        ) {
          throw new ConflictException(
            'This iPhone message was imported concurrently. Retry with the same client event ID.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'The iPhone message could not be imported safely. Please try again.',
    );
  }

  private assertMessageTime(messageReceivedAt: Date, now: Date): void {
    if (
      messageReceivedAt.getTime() >
      now.getTime() + FUTURE_CLOCK_TOLERANCE_MS
    ) {
      throw new BadRequestException(
        'The iPhone message receipt time cannot be in the future.',
      );
    }

    const oldestAllowed =
      now.getTime() - this.config.maximumMessageAgeDays * MILLISECONDS_PER_DAY;

    if (messageReceivedAt.getTime() < oldestAllowed) {
      throw new BadRequestException(
        `The iPhone Shortcut can import messages received within the last ${this.config.maximumMessageAgeDays} days only.`,
      );
    }
  }

  private assertReplayMatches(
    existing: FinancialMessageImport,
    body: CreateFinancialMessageImportDto,
    fingerprint: string,
    messageReceivedAt: Date,
  ): void {
    if (
      existing.fingerprint !== fingerprint ||
      existing.sourceHint !== String(body.sourceHint) ||
      existing.messageReceivedAt.getTime() !== messageReceivedAt.getTime()
    ) {
      throw new ConflictException(
        'This client event ID was already used for a different iPhone message.',
      );
    }
  }
}
