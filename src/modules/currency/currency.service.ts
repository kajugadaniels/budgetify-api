import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';

import {
  DEFAULT_USD_TO_RWF_RATE,
  USD_TO_RWF_RATE_SETTING_KEY,
} from './currency.constants';
import { ExchangeRateResponseDto } from './dto/exchange-rate.response.dto';
import { CurrencyRepository } from './currency.repository';

@Injectable()
export class CurrencyService {
  constructor(private readonly currencyRepository: CurrencyRepository) {}

  async getUsdToRwfRate(): Promise<ExchangeRateResponseDto> {
    const setting = await this.currencyRepository.findSettingByKey(
      USD_TO_RWF_RATE_SETTING_KEY,
    );

    return {
      baseCurrency: Currency.USD,
      targetCurrency: Currency.RWF,
      rate: this.parseRate(setting?.value),
      updatedAt: setting?.updatedAt ?? null,
    };
  }

  async updateUsdToRwfRate(rate: number): Promise<ExchangeRateResponseDto> {
    if (!Number.isFinite(rate) || rate < 1) {
      throw new BadRequestException('Rate must be at least 1 RWF per USD.');
    }

    const setting = await this.currencyRepository.upsertSetting(
      USD_TO_RWF_RATE_SETTING_KEY,
      String(rate),
    );

    return {
      baseCurrency: Currency.USD,
      targetCurrency: Currency.RWF,
      rate: this.parseRate(setting.value),
      updatedAt: setting.updatedAt,
    };
  }

  async convertToRwf(
    amount: number,
    currency: Currency,
  ): Promise<Prisma.Decimal> {
    const decimalAmount = new Prisma.Decimal(amount);

    if (currency === Currency.RWF) {
      return decimalAmount;
    }

    const exchangeRate = await this.getUsdToRwfRate();

    return decimalAmount.mul(exchangeRate.rate);
  }

  private parseRate(value: string | undefined): number {
    if (!value) {
      return DEFAULT_USD_TO_RWF_RATE;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed >= 1
      ? parsed
      : DEFAULT_USD_TO_RWF_RATE;
  }
}
