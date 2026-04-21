import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeCategoryOptionResponseDto } from './dto/income-category-option.response.dto';
import { IncomeDetailResponseDto } from './dto/income-detail.response.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { IncomeSummaryQueryDto } from './dto/income-summary.query.dto';
import { IncomeSummaryResponseDto } from './dto/income-summary.response.dto';
import { ListIncomeQueryDto } from './dto/list-income.query.dto';
import { PaginatedIncomeResponseDto } from './dto/paginated-income.response.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';
import { INCOME_ROUTES } from './income.routes';
import { IncomeMapper } from './mappers/income.mapper';
import { IncomeService } from './income.service';
import {
  ApiCreateCurrentUserIncomeEndpoint,
  ApiDeleteCurrentUserIncomeEndpoint,
  ApiGetCurrentUserIncomeDetailEndpoint,
  ApiListIncomeCategoriesEndpoint,
  ApiListCurrentUserIncomeEndpoint,
  ApiSummarizeCurrentUserIncomeEndpoint,
  ApiUpdateCurrentUserIncomeEndpoint,
} from './income.swagger';

@ApiTags('Income')
@Controller(INCOME_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get(INCOME_ROUTES.categories)
  @ApiListIncomeCategoriesEndpoint()
  listIncomeCategories(): IncomeCategoryOptionResponseDto[] {
    return this.incomeService.listIncomeCategories();
  }

  @Get()
  @ApiListCurrentUserIncomeEndpoint()
  async listCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListIncomeQueryDto,
  ): Promise<PaginatedIncomeResponseDto> {
    const incomes = await this.incomeService.listCurrentUserIncome(
      user.userId,
      query,
    );

    return IncomeMapper.toPaginatedIncomeResponse(incomes);
  }

  @Get(INCOME_ROUTES.summary)
  @ApiSummarizeCurrentUserIncomeEndpoint()
  async summarizeCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: IncomeSummaryQueryDto,
  ): Promise<IncomeSummaryResponseDto> {
    return this.incomeService.summarizeCurrentUserIncome(user.userId, query);
  }

  @Get(INCOME_ROUTES.byId)
  @ApiGetCurrentUserIncomeDetailEndpoint()
  async getCurrentUserIncomeDetail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('incomeId', ParseUUIDPipe) incomeId: string,
  ): Promise<IncomeDetailResponseDto> {
    return this.incomeService.getCurrentUserIncomeDetail(user.userId, incomeId);
  }

  @Post()
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserIncomeEndpoint()
  async createCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateIncomeRequestDto,
  ): Promise<IncomeResponseDto> {
    const income = await this.incomeService.createCurrentUserIncome(
      user.userId,
      body,
    );

    return IncomeMapper.toIncomeResponse(income);
  }

  @Patch(INCOME_ROUTES.byId)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateCurrentUserIncomeEndpoint()
  async updateCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('incomeId', ParseUUIDPipe) incomeId: string,
    @Body() body: UpdateIncomeRequestDto,
  ): Promise<IncomeResponseDto> {
    const income = await this.incomeService.updateCurrentUserIncome(
      user.userId,
      incomeId,
      body,
    );

    return IncomeMapper.toIncomeResponse(income);
  }

  @Delete(INCOME_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiDeleteCurrentUserIncomeEndpoint()
  async deleteCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('incomeId', ParseUUIDPipe) incomeId: string,
  ): Promise<void> {
    await this.incomeService.deleteCurrentUserIncome(user.userId, incomeId);
  }
}
