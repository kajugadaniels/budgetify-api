import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionTransferType } from '@prisma/client';

import {
  MAX_TRANSACTION_AMOUNT_RWF,
  MIN_TRANSACTION_AMOUNT_RWF,
  MOMO_TO_EKASH_FLAT_FEE_RWF,
  MOMO_TO_EKASH_TARIFF_SOURCE,
  MOMO_TO_EKASH_TARIFF_VERSION,
  MOMO_TO_MOMO_FEE_BANDS,
  MOMO_TO_MOMO_TARIFF_SOURCE,
  MOMO_TO_MOMO_TARIFF_VERSION,
  TransactionFeeQuote,
} from '../transaction-tariffs';

@Injectable()
export class TransactionFeeCalculatorService {
  calculate(
    amount: number,
    transferType: TransactionTransferType,
  ): TransactionFeeQuote {
    this.assertValidAmount(amount);

    const { feeAmount, tariffVersion, tariffSource } = this.resolveTariff(
      amount,
      transferType,
    );

    return {
      transferType,
      currency: 'RWF',
      amount,
      feeAmount,
      totalAmount: amount + feeAmount,
      tariffVersion,
      tariffSource,
    };
  }

  private assertValidAmount(amount: number): void {
    if (
      !Number.isSafeInteger(amount) ||
      amount < MIN_TRANSACTION_AMOUNT_RWF ||
      amount > MAX_TRANSACTION_AMOUNT_RWF
    ) {
      throw new BadRequestException(
        `Amount must be a whole number between ${MIN_TRANSACTION_AMOUNT_RWF} and ${MAX_TRANSACTION_AMOUNT_RWF} RWF.`,
      );
    }
  }

  private resolveTariff(
    amount: number,
    transferType: TransactionTransferType,
  ): { feeAmount: number; tariffVersion: string; tariffSource: string } {
    if (transferType === TransactionTransferType.MOMO_TO_EKASH) {
      return {
        feeAmount: MOMO_TO_EKASH_FLAT_FEE_RWF,
        tariffVersion: MOMO_TO_EKASH_TARIFF_VERSION,
        tariffSource: MOMO_TO_EKASH_TARIFF_SOURCE,
      };
    }

    if (transferType === TransactionTransferType.MOMO_TO_MOMO) {
      const band = MOMO_TO_MOMO_FEE_BANDS.find(
        ({ minAmount, maxAmount }) =>
          amount >= minAmount && amount <= maxAmount,
      );

      if (band) {
        return {
          feeAmount: band.feeAmount,
          tariffVersion: MOMO_TO_MOMO_TARIFF_VERSION,
          tariffSource: MOMO_TO_MOMO_TARIFF_SOURCE,
        };
      }
    }

    throw new BadRequestException('Unsupported transaction transfer type.');
  }
}
