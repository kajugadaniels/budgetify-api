import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  Currency,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
} from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  findMatchingOptionValues,
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { IncomeService } from '../income/income.service';
import { UsersService } from '../users/users.service';
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ExpenseAuditResponseDto } from './dto/expense-audit.response.dto';
import { ExpenseSummaryQueryDto } from './dto/expense-summary.query.dto';
import { ExpenseSummaryResponseDto } from './dto/expense-summary.response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query.dto';
import { MobileMoneyQuoteRequestDto } from './dto/mobile-money-quote.request.dto';
import { MobileMoneyQuoteResponseDto } from './dto/mobile-money-quote.response.dto';
import { MobileMoneyTariffResponseDto } from './dto/mobile-money-tariff.response.dto';
import { UpdateMobileMoneyTariffRequestDto } from './dto/update-mobile-money-tariff.request.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSE_CATEGORY_OPTIONS } from './expense-category-options';
import { ExpenseWithCreator, ExpensesRepository } from './expenses.repository';
import { MobileMoneyTariffService } from './mobile-money-tariff.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    @Inject(forwardRef(() => IncomeService))
    private readonly incomeService: IncomeService,
    private readonly mobileMoneyTariffService: MobileMoneyTariffService,
  ) {}

  async listCurrentUserExpenses(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseWithCreator>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);
    const search = normalizeListSearch(query.search);
    const searchCategories = findMatchingOptionValues(
      EXPENSE_CATEGORY_OPTIONS,
      search,
    );

    return this.expensesRepository.findManyByUserIds(visibleUserIds, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      search,
      searchCategories,
      category: query.category,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  listExpenseCategories(): ExpenseCategoryOptionResponseDto[] {
    return EXPENSE_CATEGORY_OPTIONS.map((option) => ({ ...option }));
  }

  async listCurrentUserMobileMoneyTariffs(
    userId: string,
  ): Promise<MobileMoneyTariffResponseDto[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const tariffs = await this.expensesRepository.findAllTariffs();
    return tariffs.map((tariff) => this.toMobileMoneyTariffResponse(tariff));
  }

  async updateCurrentUserMobileMoneyTariff(
    userId: string,
    tariffId: string,
    payload: UpdateMobileMoneyTariffRequestDto,
  ): Promise<MobileMoneyTariffResponseDto> {
    if (
      payload.provider === undefined &&
      payload.channel === undefined &&
      payload.network === undefined &&
      payload.minAmount === undefined &&
      payload.maxAmount === undefined &&
      payload.feeAmount === undefined &&
      payload.active === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one mobile money tariff field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);
    const tariff = await this.expensesRepository.findTariffById(tariffId);

    if (!tariff) {
      throw new NotFoundException('Mobile money tariff was not found.');
    }

    const channel = payload.channel ?? tariff.channel;
    const network =
      payload.network === undefined ? tariff.network : payload.network;
    const minAmount = payload.minAmount ?? Number(tariff.minAmount);
    const maxAmount = payload.maxAmount ?? Number(tariff.maxAmount);

    if (minAmount > maxAmount) {
      throw new BadRequestException(
        'Mobile money tariff minimum amount must be less than or equal to the maximum amount.',
      );
    }

    if (
      channel === ExpenseMobileMoneyChannel.MERCHANT_CODE &&
      network !== null
    ) {
      throw new BadRequestException(
        'Merchant code tariffs must not include a network classification.',
      );
    }

    if (
      channel === ExpenseMobileMoneyChannel.P2P_TRANSFER &&
      network === null
    ) {
      throw new BadRequestException(
        'P2P mobile money tariffs require a network classification.',
      );
    }

    const updatedTariff = await this.expensesRepository.updateTariff(tariffId, {
      provider: payload.provider,
      channel: payload.channel,
      network: payload.network === undefined ? undefined : payload.network,
      minAmount: payload.minAmount,
      maxAmount: payload.maxAmount,
      feeAmount: payload.feeAmount,
      active: payload.active,
    });

    return this.toMobileMoneyTariffResponse(updatedTariff);
  }

  async quoteCurrentUserMobileMoneyExpense(
    userId: string,
    payload: MobileMoneyQuoteRequestDto,
  ): Promise<MobileMoneyQuoteResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const charges = await this.mobileMoneyTariffService.resolveExpenseCharges({
      amount: payload.amount,
      currency: payload.currency ?? Currency.RWF,
      paymentMethod: 'MOBILE_MONEY',
      mobileMoneyChannel: payload.mobileMoneyChannel,
      mobileMoneyProvider: payload.mobileMoneyProvider,
      mobileMoneyNetwork: payload.mobileMoneyNetwork,
    });

    return {
      amount: Number(charges.amount),
      currency: charges.currency,
      amountRwf: Number(charges.amountRwf),
      feeAmount: Number(charges.feeAmount),
      feeAmountRwf: Number(charges.feeAmountRwf),
      totalAmountRwf: Number(charges.totalAmountRwf),
      mobileMoneyProvider: charges.mobileMoneyProvider!,
      mobileMoneyChannel: charges.mobileMoneyChannel!,
      mobileMoneyNetwork: charges.mobileMoneyNetwork,
    };
  }

  async summarizeCurrentUserExpenses(
    userId: string,
    query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseSummaryResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const dateRange = resolveListDateRange(query);

    const [expenseSummary, incomeSummary] = await Promise.all([
      this.expensesRepository.summarizeByUserIds(visibleUserIds, {
        dateFrom: dateRange?.dateFrom,
        dateTo: dateRange?.dateTo,
      }),
      this.incomeService.summarizeCurrentUserIncome(userId, query),
    ]);

    return {
      totalExpensesRwf: expenseSummary.totalBaseAmountRwf,
      totalFeesRwf: expenseSummary.totalFeeAmountRwf,
      totalChargedExpensesRwf: expenseSummary.totalChargedAmountRwf,
      averageExpenseRwf:
        expenseSummary.totalCount > 0
          ? expenseSummary.totalChargedAmountRwf / expenseSummary.totalCount
          : 0,
      largestExpenseRwf: expenseSummary.largestChargedAmountRwf,
      availableMoneyNowRwf: incomeSummary.availableMoneyNowRwf,
      expenseCount: expenseSummary.totalCount,
    };
  }

  async auditCurrentUserExpenses(
    userId: string,
    query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseAuditResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const dateRange = resolveListDateRange(query);

    const [expenseSummary, incomeSummary] = await Promise.all([
      this.expensesRepository.summarizeByUserIds(visibleUserIds, {
        dateFrom: dateRange?.dateFrom,
        dateTo: dateRange?.dateTo,
      }),
      this.incomeService.summarizeCurrentUserIncome(userId, query),
    ]);

    const availableMoneyBeforeExpensesRwf =
      incomeSummary.availableMoneyNowRwf + expenseSummary.totalBaseAmountRwf;
    const recomputedAvailableMoneyAfterExpensesRwf =
      availableMoneyBeforeExpensesRwf - expenseSummary.totalChargedAmountRwf;
    const reconciliationDifferenceRwf =
      incomeSummary.availableMoneyNowRwf -
      recomputedAvailableMoneyAfterExpensesRwf;

    return {
      periodStartDate: dateRange?.dateFrom?.toISOString().split('T')[0] ?? null,
      periodEndDate:
        dateRange?.dateTo === undefined
          ? null
          : new Date(dateRange.dateTo.getTime() - 1).toISOString().slice(0, 10),
      totalBaseExpensesRwf: expenseSummary.totalBaseAmountRwf,
      totalPaymentFeesRwf: expenseSummary.totalFeeAmountRwf,
      totalChargedExpensesRwf: expenseSummary.totalChargedAmountRwf,
      expenseCount: expenseSummary.totalCount,
      feeBearingExpenseCount: expenseSummary.feeBearingExpenseCount,
      availableMoneyBeforeExpensesRwf,
      availableMoneyAfterExpensesRwf: incomeSummary.availableMoneyNowRwf,
      recomputedAvailableMoneyAfterExpensesRwf,
      reconciliationDifferenceRwf,
      isBalanced: reconciliationDifferenceRwf === 0,
    };
  }

  async createCurrentUserExpense(
    userId: string,
    payload: CreateExpenseRequestDto,
  ): Promise<ExpenseWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const charges = await this.mobileMoneyTariffService.resolveExpenseCharges({
      amount: payload.amount,
      currency: payload.currency ?? Currency.RWF,
      paymentMethod: payload.paymentMethod,
      mobileMoneyChannel: payload.mobileMoneyChannel,
      mobileMoneyProvider: payload.mobileMoneyProvider,
      mobileMoneyNetwork: payload.mobileMoneyNetwork,
    });
    await this.assertCanAffordChargedExpense(
      userId,
      visibleUserIds,
      Number(charges.totalAmountRwf),
    );

    return this.expensesRepository.create({
      userId,
      label: payload.label,
      amount: charges.amount,
      currency: charges.currency,
      amountRwf: charges.amountRwf,
      feeAmount: charges.feeAmount,
      feeAmountRwf: charges.feeAmountRwf,
      totalAmountRwf: charges.totalAmountRwf,
      paymentMethod: charges.paymentMethod,
      mobileMoneyChannel: charges.mobileMoneyChannel,
      mobileMoneyProvider: charges.mobileMoneyProvider,
      mobileMoneyNetwork: charges.mobileMoneyNetwork,
      category: payload.category,
      date: new Date(payload.date),
      note: payload.note ?? null,
    });
  }

  async updateCurrentUserExpense(
    userId: string,
    expenseId: string,
    payload: UpdateExpenseRequestDto,
  ): Promise<ExpenseWithCreator> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.currency === undefined &&
      payload.category === undefined &&
      payload.paymentMethod === undefined &&
      payload.mobileMoneyChannel === undefined &&
      payload.mobileMoneyProvider === undefined &&
      payload.mobileMoneyNetwork === undefined &&
      payload.date === undefined &&
      payload.note === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one expense field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const expense = await this.findVisibleExpenseOrThrow(userId, expenseId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const charges =
      payload.amount !== undefined ||
      payload.currency !== undefined ||
      payload.paymentMethod !== undefined ||
      payload.mobileMoneyChannel !== undefined ||
      payload.mobileMoneyProvider !== undefined ||
      payload.mobileMoneyNetwork !== undefined
        ? await this.mobileMoneyTariffService.resolveExpenseCharges({
            amount: payload.amount ?? Number(expense.amount),
            currency: payload.currency ?? expense.currency,
            paymentMethod: payload.paymentMethod ?? expense.paymentMethod,
            mobileMoneyChannel:
              payload.mobileMoneyChannel === undefined
                ? (expense.mobileMoneyChannel ?? undefined)
                : payload.mobileMoneyChannel,
            mobileMoneyProvider:
              payload.mobileMoneyProvider === undefined
                ? (expense.mobileMoneyProvider ?? undefined)
                : payload.mobileMoneyProvider,
            mobileMoneyNetwork:
              payload.mobileMoneyNetwork === undefined
                ? (expense.mobileMoneyNetwork ?? undefined)
                : payload.mobileMoneyNetwork,
          })
        : null;

    if (charges !== null) {
      await this.assertCanAffordChargedExpense(
        userId,
        visibleUserIds,
        Number(charges.totalAmountRwf),
        Number(expense.totalAmountRwf),
      );
    }

    return this.expensesRepository.update(expense.id, {
      label: payload.label,
      amount: charges?.amount,
      currency: charges?.currency,
      amountRwf: charges?.amountRwf,
      feeAmount: charges?.feeAmount,
      feeAmountRwf: charges?.feeAmountRwf,
      totalAmountRwf: charges?.totalAmountRwf,
      paymentMethod: charges?.paymentMethod,
      mobileMoneyChannel: charges?.mobileMoneyChannel,
      mobileMoneyProvider: charges?.mobileMoneyProvider,
      mobileMoneyNetwork: charges?.mobileMoneyNetwork,
      category: payload.category,
      date: payload.date === undefined ? undefined : new Date(payload.date),
      note: payload.note,
    });
  }

  async deleteCurrentUserExpense(
    userId: string,
    expenseId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const expense = await this.findOwnedExpenseOrThrow(userId, expenseId);

    await this.expensesRepository.update(expense.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedExpenseOrThrow(
    userId: string,
    expenseId: string,
  ): Promise<ExpenseWithCreator> {
    return this.findVisibleExpenseOrThrow(userId, expenseId);
  }

  private async findVisibleExpenseOrThrow(
    userId: string,
    expenseId: string,
  ): Promise<ExpenseWithCreator> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const expense = await this.expensesRepository.findActiveByIdAndUserIds(
      expenseId,
      visibleUserIds,
    );

    if (!expense) {
      throw new NotFoundException('Expense record was not found.');
    }

    return expense;
  }

  private async assertCanAffordChargedExpense(
    userId: string,
    visibleUserIds: string[],
    nextChargedAmountRwf: number,
    existingChargedAmountRwf = 0,
  ): Promise<void> {
    const [incomeSummary, expenseSummary] = await Promise.all([
      this.incomeService.summarizeCurrentUserIncome(userId, {}),
      this.expensesRepository.summarizeByUserIds(visibleUserIds),
    ]);
    const availableMoneyAfterChargedExpensesRwf =
      incomeSummary.availableMoneyNowRwf +
      incomeSummary.totalExpensesRwf -
      expenseSummary.totalChargedAmountRwf;
    const maxAllowedChargedAmountRwf =
      availableMoneyAfterChargedExpensesRwf + existingChargedAmountRwf;

    if (nextChargedAmountRwf <= maxAllowedChargedAmountRwf) {
      return;
    }

    const shortageRwf = nextChargedAmountRwf - maxAllowedChargedAmountRwf;

    throw new BadRequestException(
      `This expense exceeds available money by ${shortageRwf.toFixed(
        2,
      )} RWF. Available charged capacity is ${Math.max(
        maxAllowedChargedAmountRwf,
        0,
      ).toFixed(2)} RWF.`,
    );
  }

  private toMobileMoneyTariffResponse(tariff: {
    id: string;
    provider: string;
    channel: string;
    network: string | null;
    minAmount: { toString(): string };
    maxAmount: { toString(): string };
    feeAmount: { toString(): string };
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): MobileMoneyTariffResponseDto {
    return {
      id: tariff.id,
      provider: tariff.provider as MobileMoneyTariffResponseDto['provider'],
      channel: tariff.channel as MobileMoneyTariffResponseDto['channel'],
      network: tariff.network as ExpenseMobileMoneyNetwork | null,
      minAmount: Number(tariff.minAmount),
      maxAmount: Number(tariff.maxAmount),
      feeAmount: Number(tariff.feeAmount),
      active: tariff.active,
      createdAt: tariff.createdAt,
      updatedAt: tariff.updatedAt,
    };
  }
}
