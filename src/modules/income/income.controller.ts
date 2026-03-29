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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';
import { INCOME_ROUTES } from './income.routes';
import { IncomeMapper } from './mappers/income.mapper';
import { IncomeService } from './income.service';
import {
  ApiCreateCurrentUserIncomeEndpoint,
  ApiDeleteCurrentUserIncomeEndpoint,
  ApiListCurrentUserIncomeEndpoint,
  ApiUpdateCurrentUserIncomeEndpoint,
} from './income.swagger';

@ApiTags('Income')
@Controller(INCOME_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get()
  @ApiListCurrentUserIncomeEndpoint()
  async listCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<IncomeResponseDto[]> {
    const incomes = await this.incomeService.listCurrentUserIncome(user.userId);

    return IncomeMapper.toIncomeResponseList(incomes);
  }

  @Post()
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
  @ApiDeleteCurrentUserIncomeEndpoint()
  async deleteCurrentUserIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('incomeId', ParseUUIDPipe) incomeId: string,
  ): Promise<void> {
    await this.incomeService.deleteCurrentUserIncome(user.userId, incomeId);
  }
}
