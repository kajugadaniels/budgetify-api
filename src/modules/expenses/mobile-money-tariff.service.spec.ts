import { BadRequestException } from '@nestjs/common';
import {
  Currency,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
  ExpensePaymentMethod,
  Prisma,
} from '@prisma/client';

import { MobileMoneyTariffService } from './mobile-money-tariff.service';

describe('MobileMoneyTariffService', () => {
  const expensesRepository = {
    findActiveTariffForAmount: jest.fn(),
  };
  const currencyService = {
    convertToRwf: jest.fn(),
    getUsdToRwfRate: jest.fn(),
  };

  let service: MobileMoneyTariffService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MobileMoneyTariffService(
      expensesRepository as never,
      currencyService as never,
    );
  });

  it('returns zero fee for merchant code payments', async () => {
    currencyService.convertToRwf.mockResolvedValue(new Prisma.Decimal(5000));
    expensesRepository.findActiveTariffForAmount.mockResolvedValue({
      feeAmount: new Prisma.Decimal(0),
    });

    const result = await service.resolveExpenseCharges({
      amount: 5000,
      currency: Currency.RWF,
      paymentMethod: ExpensePaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: ExpenseMobileMoneyProvider.MTN_RWANDA,
      mobileMoneyChannel: ExpenseMobileMoneyChannel.MERCHANT_CODE,
    });

    expect(result).toMatchObject({
      amountRwf: new Prisma.Decimal(5000),
      feeAmountRwf: new Prisma.Decimal(0),
      totalAmountRwf: new Prisma.Decimal(5000),
      mobileMoneyNetwork: null,
    });
  });

  it('applies the MTN Rwanda on-net 1-1000 band', async () => {
    currencyService.convertToRwf.mockResolvedValue(new Prisma.Decimal(1000));
    expensesRepository.findActiveTariffForAmount.mockResolvedValue({
      feeAmount: new Prisma.Decimal(20),
    });

    const result = await service.resolveExpenseCharges({
      amount: 1000,
      currency: Currency.RWF,
      paymentMethod: ExpensePaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: ExpenseMobileMoneyProvider.MTN_RWANDA,
      mobileMoneyChannel: ExpenseMobileMoneyChannel.P2P_TRANSFER,
      mobileMoneyNetwork: ExpenseMobileMoneyNetwork.ON_NET,
    });

    expect(result.feeAmountRwf.toNumber()).toBe(20);
    expect(result.totalAmountRwf.toNumber()).toBe(1020);
  });

  it('applies the MTN Rwanda on-net 1001-10000 band', async () => {
    currencyService.convertToRwf.mockResolvedValue(new Prisma.Decimal(5000));
    expensesRepository.findActiveTariffForAmount.mockResolvedValue({
      feeAmount: new Prisma.Decimal(100),
    });

    const result = await service.resolveExpenseCharges({
      amount: 5000,
      currency: Currency.RWF,
      paymentMethod: ExpensePaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: ExpenseMobileMoneyProvider.MTN_RWANDA,
      mobileMoneyChannel: ExpenseMobileMoneyChannel.P2P_TRANSFER,
      mobileMoneyNetwork: ExpenseMobileMoneyNetwork.ON_NET,
    });

    expect(result.feeAmountRwf.toNumber()).toBe(100);
    expect(result.totalAmountRwf.toNumber()).toBe(5100);
  });

  it('applies the MTN Rwanda off-net 1001-10000 band', async () => {
    currencyService.convertToRwf.mockResolvedValue(new Prisma.Decimal(5000));
    expensesRepository.findActiveTariffForAmount.mockResolvedValue({
      feeAmount: new Prisma.Decimal(200),
    });

    const result = await service.resolveExpenseCharges({
      amount: 5000,
      currency: Currency.RWF,
      paymentMethod: ExpensePaymentMethod.MOBILE_MONEY,
      mobileMoneyProvider: ExpenseMobileMoneyProvider.MTN_RWANDA,
      mobileMoneyChannel: ExpenseMobileMoneyChannel.P2P_TRANSFER,
      mobileMoneyNetwork: ExpenseMobileMoneyNetwork.OFF_NET,
    });

    expect(result.feeAmountRwf.toNumber()).toBe(200);
    expect(result.totalAmountRwf.toNumber()).toBe(5200);
  });

  it('rejects P2P transfers without a network classification', async () => {
    currencyService.convertToRwf.mockResolvedValue(new Prisma.Decimal(5000));

    await expect(
      service.resolveExpenseCharges({
        amount: 5000,
        currency: Currency.RWF,
        paymentMethod: ExpensePaymentMethod.MOBILE_MONEY,
        mobileMoneyProvider: ExpenseMobileMoneyProvider.MTN_RWANDA,
        mobileMoneyChannel: ExpenseMobileMoneyChannel.P2P_TRANSFER,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'P2P mobile money expenses require a network classification.',
      ),
    );
  });
});
