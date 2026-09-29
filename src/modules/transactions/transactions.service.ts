import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  Currency,
  Prisma,
  Transaction,
  TransactionRecipientType,
  TransactionTransferType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { CreateTransactionRequestDto } from './dto/create-transaction.request.dto';
import { TransactionQuoteRequestDto } from './dto/transaction-quote.request.dto';
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionFeeCalculatorService } from './services/transaction-fee-calculator.service';
import { TransactionsRepository } from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly feeCalculator: TransactionFeeCalculatorService,
  ) {}

  quote(body: TransactionQuoteRequestDto): TransactionQuoteResponseDto {
    return this.feeCalculator.calculate(body.amount, body.transferType);
  }

  async create(
    userId: string,
    body: CreateTransactionRequestDto,
  ): Promise<Transaction> {
    const receiverIdentifier = this.normalizeReceiverIdentifier(body);

    if (body.idempotencyKey) {
      const existing = await this.transactionsRepository.findByIdempotencyKey(
        userId,
        body.idempotencyKey,
      );

      if (existing) {
        this.assertIdempotentRequestMatches(existing, body, receiverIdentifier);

        return existing;
      }
    }

    const quote = this.feeCalculator.calculate(body.amount, body.transferType);

    try {
      return await this.transactionsRepository.create({
        userId,
        reference: this.createReference(),
        idempotencyKey: body.idempotencyKey,
        transferType: body.transferType,
        recipientType: body.recipientType,
        category: body.category,
        currency: Currency.RWF,
        amount: quote.amount,
        feeAmount: quote.feeAmount,
        totalAmount: quote.totalAmount,
        receiverIdentifier,
        receiverName: null,
        note: body.note,
        tariffVersion: quote.tariffVersion,
        tariffSource: quote.tariffSource,
      });
    } catch (error) {
      if (
        body.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.transactionsRepository.findByIdempotencyKey(
          userId,
          body.idempotencyKey,
        );

        if (existing) {
          this.assertIdempotentRequestMatches(
            existing,
            body,
            receiverIdentifier,
          );

          return existing;
        }
      }

      throw error;
    }
  }

  private normalizeReceiverIdentifier(
    body: CreateTransactionRequestDto,
  ): string {
    const raw = body.receiverIdentifier.trim();

    if (body.recipientType === TransactionRecipientType.PHONE) {
      if (body.transferType === TransactionTransferType.MOMO_PAY) {
        throw new BadRequestException(
          'MoMo Pay requires a MoMo merchant code.',
        );
      }

      const compact = raw.replace(/[\s()+-]/g, '');

      if (/^07\d{8}$/.test(compact)) {
        return `+250${compact.slice(1)}`;
      }

      if (/^2507\d{8}$/.test(compact)) {
        return `+${compact}`;
      }

      if (/^7\d{8}$/.test(compact)) {
        return `+250${compact}`;
      }

      throw new BadRequestException(
        'Receiver phone must be a valid Rwanda phone number.',
      );
    }

    if (body.recipientType === TransactionRecipientType.MOMO_CODE) {
      if (body.transferType !== TransactionTransferType.MOMO_PAY) {
        throw new BadRequestException(
          'MoMo merchant codes are only supported through MoMo Pay.',
        );
      }

      const momoCode = raw.replace(/\D/g, '');

      if (!/^\d{3,12}$/.test(momoCode)) {
        throw new BadRequestException(
          'MoMo merchant code must contain between 3 and 12 digits.',
        );
      }

      return momoCode;
    }

    if (body.transferType !== TransactionTransferType.MOMO_TO_EKASH) {
      throw new BadRequestException(
        'Bank account recipients are only supported through eKash.',
      );
    }

    const account = raw.replace(/\D/g, '');

    if (!/^\d{6,34}$/.test(account)) {
      throw new BadRequestException(
        'Bank account number must contain between 6 and 34 digits.',
      );
    }

    return account;
  }

  private assertIdempotentRequestMatches(
    existing: Transaction,
    body: CreateTransactionRequestDto,
    receiverIdentifier: string,
  ): void {
    const matches =
      existing.amount === body.amount &&
      existing.transferType === body.transferType &&
      existing.recipientType === body.recipientType &&
      existing.category === body.category &&
      existing.receiverIdentifier === receiverIdentifier &&
      existing.note === (body.note ?? null);

    if (!matches) {
      throw new ConflictException(
        'This idempotency key was already used for a different transaction.',
      );
    }
  }

  private createReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();

    const entropy = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    return `BGT-${timestamp}-${entropy}`;
  }
}
