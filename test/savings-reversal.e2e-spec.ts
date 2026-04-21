import {
  BadRequestException,
  ParseUUIDPipe,
  RequestMethod,
} from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Currency, Prisma, SavingTransactionType } from '@prisma/client';

import { SavingsController } from '../src/modules/savings/savings.controller';
import { SavingsService } from '../src/modules/savings/savings.service';
import { SAVINGS_ROUTES } from '../src/modules/savings/savings.routes';

describe('Savings reversal endpoint contract (e2e)', () => {
  let controller: SavingsController;

  const savingsService = {
    reverseCurrentUserSavingDeposit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SavingsController],
      providers: [
        {
          provide: SavingsService,
          useValue: savingsService,
        },
      ],
    }).compile();

    controller = moduleFixture.get(SavingsController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('declares the reverse route as POST /savings/:savingId/transactions/:transactionId/reverse', () => {
    const reverseHandlerDescriptor = Object.getOwnPropertyDescriptor(
      SavingsController.prototype,
      'reverseCurrentUserSavingDeposit',
    ) as TypedPropertyDescriptor<(...args: unknown[]) => unknown> | undefined;
    const reverseHandler = reverseHandlerDescriptor?.value;

    expect(reverseHandler).toBeDefined();
    if (!reverseHandler) {
      throw new Error('reverseCurrentUserSavingDeposit handler is missing.');
    }

    const controllerPath = Reflect.getMetadata(
      PATH_METADATA,
      SavingsController,
    ) as string;
    const methodPath = Reflect.getMetadata(
      PATH_METADATA,
      reverseHandler,
    ) as string;
    const requestMethod = Reflect.getMetadata(
      METHOD_METADATA,
      reverseHandler,
    ) as RequestMethod;

    expect(controllerPath).toBe(SAVINGS_ROUTES.base);
    expect(methodPath).toBe(SAVINGS_ROUTES.reverseDeposit);
    expect(requestMethod).toBe(RequestMethod.POST);
  });

  it('maps a reversed saving deposit through the controller endpoint', async () => {
    savingsService.reverseCurrentUserSavingDeposit.mockResolvedValue({
      id: '08eb36ae-b84d-4b8d-8c07-c0d63277356a',
      label: 'Emergency fund',
      amount: new Prisma.Decimal(0),
      currency: Currency.RWF,
      amountRwf: new Prisma.Decimal(0),
      targetAmount: null,
      targetCurrency: null,
      targetAmountRwf: null,
      startDate: null,
      endDate: null,
      date: new Date('2026-04-01T00:00:00.000Z'),
      note: 'Main safety net',
      stillHave: false,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      user: {
        id: 'user-1',
        firstName: 'Dev',
        lastName: 'Niels',
        avatarUrl: null,
      },
      transactions: [
        {
          id: 'b4a7531b-9217-46d4-9480-2b92c223d7f1',
          type: SavingTransactionType.DEPOSIT,
          amountRwf: new Prisma.Decimal(73000),
        },
        {
          id: 'b80513d8-8ab2-4535-a349-534d2c47315a',
          type: SavingTransactionType.WITHDRAWAL,
          amountRwf: new Prisma.Decimal(73000),
        },
      ],
    });

    const savingId = '08eb36ae-b84d-4b8d-8c07-c0d63277356a';
    const transactionId = 'b4a7531b-9217-46d4-9480-2b92c223d7f1';

    const response = await controller.reverseCurrentUserSavingDeposit(
      { userId: 'user-1' } as never,
      savingId,
      transactionId,
    );

    expect(savingsService.reverseCurrentUserSavingDeposit).toHaveBeenCalledWith(
      'user-1',
      savingId,
      transactionId,
    );
    expect(response).toMatchObject({
      id: savingId,
      label: 'Emergency fund',
      currentBalanceRwf: 0,
      totalDepositedRwf: 73000,
      totalWithdrawnRwf: 73000,
      stillHave: false,
      createdBy: {
        id: 'user-1',
        firstName: 'Dev',
        lastName: 'Niels',
      },
    });
  });

  it('rejects an invalid transaction UUID through the route pipe contract', async () => {
    const pipe = new ParseUUIDPipe();

    await expect(
      pipe.transform('not-a-uuid', {
        type: 'param',
        metatype: String,
        data: 'transactionId',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
