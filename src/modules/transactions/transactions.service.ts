import { ConflictException, Injectable } from '@nestjs/common';
import { Currency, Prisma, Transaction } from '@prisma/client';
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
    if (body.idempotencyKey) {
      const existing = await this.transactionsRepository.findByIdempotencyKey(
        userId,
        body.idempotencyKey,
      );

      if (existing) {
        this.assertIdempotentRequestMatches(existing, body);
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
        category: body.category,
        currency: Currency.RWF,
        amount: quote.amount,
        feeAmount: quote.feeAmount,
        totalAmount: quote.totalAmount,
        receiverPhone: body.receiverPhone,
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
        const existing =
          await this.transactionsRepository.findByIdempotencyKey(
            userId,
            body.idempotencyKey,
          );

        if (existing) {
          this.assertIdempotentRequestMatches(existing, body);
          return existing;
        }
      }

      throw error;
    }
  }

  private assertIdempotentRequestMatches(
    existing: Transaction,
    body: CreateTransactionRequestDto,
  ): void {
    const matches =
      existing.amount === body.amount &&
      existing.transferType === body.transferType &&
      existing.category === body.category &&
      existing.receiverPhone === body.receiverPhone &&
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
