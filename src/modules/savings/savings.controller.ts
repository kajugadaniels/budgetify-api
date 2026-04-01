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
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { ListSavingsQueryDto } from './dto/list-savings.query.dto';
import { PaginatedSavingResponseDto } from './dto/paginated-saving.response.dto';
import { SavingResponseDto } from './dto/saving-response.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';
import { SavingsMapper } from './mappers/savings.mapper';
import { SAVINGS_ROUTES } from './savings.routes';
import { SavingsService } from './savings.service';
import {
  ApiCreateCurrentUserSavingEndpoint,
  ApiDeleteCurrentUserSavingEndpoint,
  ApiListCurrentUserSavingsEndpoint,
  ApiUpdateCurrentUserSavingEndpoint,
} from './savings.swagger';

@ApiTags('Savings')
@Controller(SAVINGS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  @ApiListCurrentUserSavingsEndpoint()
  async listCurrentUserSavings(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListSavingsQueryDto,
  ): Promise<PaginatedSavingResponseDto> {
    const savings = await this.savingsService.listCurrentUserSavings(
      user.userId,
      query,
    );

    return SavingsMapper.toPaginatedSavingResponse(savings);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserSavingEndpoint()
  async createCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateSavingRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.createCurrentUserSaving(
      user.userId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Patch(SAVINGS_ROUTES.byId)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateCurrentUserSavingEndpoint()
  async updateCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
    @Body() body: UpdateSavingRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.updateCurrentUserSaving(
      user.userId,
      savingId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Delete(SAVINGS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiDeleteCurrentUserSavingEndpoint()
  async deleteCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
  ): Promise<void> {
    await this.savingsService.deleteCurrentUserSaving(user.userId, savingId);
  }
}
