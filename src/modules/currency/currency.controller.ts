import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrencyService } from './currency.service';
import { CURRENCY_ROUTES } from './currency.routes';
import { ExchangeRateResponseDto } from './dto/exchange-rate.response.dto';
import { UpdateExchangeRateRequestDto } from './dto/update-exchange-rate.request.dto';
import {
  ApiGetExchangeRateEndpoint,
  ApiUpdateExchangeRateEndpoint,
} from './currency.swagger';

@ApiTags('Currency')
@Controller(CURRENCY_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get(CURRENCY_ROUTES.exchangeRate)
  @ApiGetExchangeRateEndpoint()
  getExchangeRate(): Promise<ExchangeRateResponseDto> {
    return this.currencyService.getUsdToRwfRate();
  }

  @Patch(CURRENCY_ROUTES.exchangeRate)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateExchangeRateEndpoint()
  updateExchangeRate(
    @Body() body: UpdateExchangeRateRequestDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.currencyService.updateUsdToRwfRate(body.rate);
  }
}
