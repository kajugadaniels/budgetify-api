import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Currency,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
  ExpensePaymentMethod,
  Prisma,
} from '@prisma/client';

import { CurrencyService } from '../currency/currency.service';
import { ExpensesRepository } from './expenses.repository';

export interface ExpenseChargeBreakdown {
  currency: Currency;
  amount: Prisma.Decimal;
  amountRwf: Prisma.Decimal;
  feeAmount: Prisma.Decimal;
  feeAmountRwf: Prisma.Decimal;
  totalAmountRwf: Prisma.Decimal;
  paymentMethod: ExpensePaymentMethod;
  mobileMoneyChannel: ExpenseMobileMoneyChannel | null;
  mobileMoneyProvider: ExpenseMobileMoneyProvider | null;
  mobileMoneyNetwork: ExpenseMobileMoneyNetwork | null;
}

@Injectable()
export class MobileMoneyTariffService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly currencyService: CurrencyService,
  ) {}

  async resolveExpenseCharges(input: {
    amount: number;
    currency?: Currency;
    paymentMethod?: ExpensePaymentMethod;
    mobileMoneyChannel?: ExpenseMobileMoneyChannel;
    mobileMoneyProvider?: ExpenseMobileMoneyProvider;
    mobileMoneyNetwork?: ExpenseMobileMoneyNetwork;
  }): Promise<ExpenseChargeBreakdown> {
    const currency = input.currency ?? Currency.RWF;
    const paymentMethod = input.paymentMethod ?? ExpensePaymentMethod.CASH;
    const amount = new Prisma.Decimal(input.amount);
    const amountRwf = (
      await this.currencyService.convertToRwf(input.amount, currency)
    ).toDecimalPlaces(2);

    if (paymentMethod !== ExpensePaymentMethod.MOBILE_MONEY) {
      return {
        currency,
        amount,
        amountRwf,
        feeAmount: new Prisma.Decimal(0),
        feeAmountRwf: new Prisma.Decimal(0),
        totalAmountRwf: amountRwf,
        paymentMethod,
        mobileMoneyChannel: null,
        mobileMoneyProvider: null,
        mobileMoneyNetwork: null,
      };
    }

    const provider = input.mobileMoneyProvider;
    const channel = input.mobileMoneyChannel;
    const network = input.mobileMoneyNetwork ?? null;

    if (!provider || !channel) {
      throw new BadRequestException(
        'Mobile money expenses require both provider and channel.',
      );
    }

    if (
      channel === ExpenseMobileMoneyChannel.P2P_TRANSFER &&
      network === null
    ) {
      throw new BadRequestException(
        'P2P mobile money expenses require a network classification.',
      );
    }

    if (
      channel === ExpenseMobileMoneyChannel.MERCHANT_CODE &&
      input.mobileMoneyNetwork !== undefined
    ) {
      throw new BadRequestException(
        'Merchant code payments must not include a network classification.',
      );
    }

    const tariff = await this.expensesRepository.findActiveTariffForAmount(
      provider,
      channel,
      network,
      amountRwf,
    );

    if (!tariff) {
      throw new BadRequestException(
        'No active mobile money tariff was found for this amount and transfer type.',
      );
    }

    const feeAmountRwf = new Prisma.Decimal(tariff.feeAmount).toDecimalPlaces(
      2,
    );
    const feeAmount =
      currency === Currency.RWF
        ? feeAmountRwf
        : feeAmountRwf
            .dividedBy((await this.currencyService.getUsdToRwfRate()).rate)
            .toDecimalPlaces(2);

    return {
      currency,
      amount,
      amountRwf,
      feeAmount,
      feeAmountRwf,
      totalAmountRwf: amountRwf.add(feeAmountRwf),
      paymentMethod,
      mobileMoneyChannel: channel,
      mobileMoneyProvider: provider,
      mobileMoneyNetwork: network,
    };
  }
}
