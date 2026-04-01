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
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { LoanSettlementResponseDto } from './dto/loan-settlement-response.dto';
import { PaginatedLoanResponseDto } from './dto/paginated-loan.response.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import { LoansMapper } from './mappers/loans.mapper';
import { LOANS_ROUTES } from './loans.routes';
import { LoansService } from './loans.service';
import {
  ApiCreateCurrentUserLoanEndpoint,
  ApiDeleteCurrentUserLoanEndpoint,
  ApiListCurrentUserLoansEndpoint,
  ApiSendCurrentUserLoanToExpenseEndpoint,
  ApiUpdateCurrentUserLoanEndpoint,
} from './loans.swagger';

@ApiTags('Loans')
@Controller(LOANS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @ApiListCurrentUserLoansEndpoint()
  async listCurrentUserLoans(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListLoansQueryDto,
  ): Promise<PaginatedLoanResponseDto> {
    const loans = await this.loansService.listCurrentUserLoans(
      user.userId,
      query,
    );

    return LoansMapper.toPaginatedLoanResponse(loans);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserLoanEndpoint()
  async createCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateLoanRequestDto,
  ): Promise<LoanResponseDto> {
    const loan = await this.loansService.createCurrentUserLoan(
      user.userId,
      body,
    );

    return LoansMapper.toLoanResponse(loan);
  }

  @Post(LOANS_ROUTES.sendToExpense)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiSendCurrentUserLoanToExpenseEndpoint()
  async sendCurrentUserLoanToExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() body: SendLoanToExpenseRequestDto,
  ): Promise<LoanSettlementResponseDto> {
    const result = await this.loansService.sendCurrentUserLoanToExpense(
      user.userId,
      loanId,
      body,
    );

    return LoansMapper.toLoanSettlementResponse(result);
  }

  @Patch(LOANS_ROUTES.byId)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateCurrentUserLoanEndpoint()
  async updateCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() body: UpdateLoanRequestDto,
  ): Promise<LoanResponseDto> {
    const loan = await this.loansService.updateCurrentUserLoan(
      user.userId,
      loanId,
      body,
    );

    return LoansMapper.toLoanResponse(loan);
  }

  @Delete(LOANS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiDeleteCurrentUserLoanEndpoint()
  async deleteCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ): Promise<void> {
    await this.loansService.deleteCurrentUserLoan(user.userId, loanId);
  }
}
