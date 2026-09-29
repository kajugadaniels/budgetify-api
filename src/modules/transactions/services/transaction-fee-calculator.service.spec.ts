import { BadRequestException } from '@nestjs/common';
import { TransactionTransferType } from '@prisma/client';

import { TransactionFeeCalculatorService } from './transaction-fee-calculator.service';

describe('TransactionFeeCalculatorService', () => {
  const calculator = new TransactionFeeCalculatorService();

  describe('MoMo to MoMo', () => {
    it.each([
      [1, 20],
      [1_000, 20],
      [1_001, 100],
      [10_000, 100],
      [10_001, 250],
      [150_000, 250],
      [150_001, 1_500],
      [2_000_000, 1_500],
      [2_000_001, 3_000],
      [5_000_000, 3_000],
      [5_000_001, 5_000],
      [10_000_000, 5_000],
    ])('calculates the fee at the %i RWF boundary', (amount, expectedFee) => {
      const quote = calculator.calculate(
        amount,
        TransactionTransferType.MOMO_TO_MOMO,
      );

      expect(quote.feeAmount).toBe(expectedFee);
      expect(quote.totalAmount).toBe(amount + expectedFee);
    });
  });

  describe('MoMo to eKash', () => {
    it.each([1, 1_000, 150_000, 2_000_000, 10_000_000])(
      'charges the configured flat fee for %i RWF',
      (amount) => {
        const quote = calculator.calculate(
          amount,
          TransactionTransferType.MOMO_TO_EKASH,
        );

        expect(quote.feeAmount).toBe(20);
        expect(quote.totalAmount).toBe(amount + 20);
      },
    );
  });

  it.each([0, -1, 10_000_001, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid amount %s',
    (amount) => {
      expect(() =>
        calculator.calculate(amount, TransactionTransferType.MOMO_TO_MOMO),
      ).toThrow(BadRequestException);
    },
  );
});
