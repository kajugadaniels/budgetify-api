import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateIncomeDto,
  LinkIncomeDto,
  ListIncomesDto,
  ReceiveIncomeDto,
  UpdateIncomeDto,
} from './incomes.dto';
import { IncomesService } from './incomes.service';

@ApiTags('Income')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomes: IncomesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List owned income and period totals; expected income is never included in received totals.',
  })
  list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListIncomesDto,
  ) {
    return this.incomes.list(user.userId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Record expected or received manual income, idempotently.',
  })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateIncomeDto,
  ) {
    return this.incomes.create(user.userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateIncomeDto,
  ) {
    return this.incomes.update(user.userId, id, body);
  }

  @Post(':id/receive')
  receive(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ReceiveIncomeDto,
  ) {
    return this.incomes.receive(user.userId, id, body);
  }

  @Get(':id/payments')
  candidates(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListIncomesDto,
  ) {
    return this.incomes.candidates(user.userId, id, query);
  }

  @Post(':id/link')
  link(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: LinkIncomeDto,
  ) {
    return this.incomes.link(user.userId, id, body);
  }

  @Delete(':id')
  archive(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.incomes.archive(user.userId, id);
  }
}
