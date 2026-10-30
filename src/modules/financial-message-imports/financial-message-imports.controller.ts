import {
  Body,
  Controller,
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
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateFinancialMessageImportDto,
  FinancialMessageImportResponseDto,
} from './financial-message-import.dto';
import { FinancialMessageImportsService } from './financial-message-imports.service';
import {
  ConfirmFinancialMessageImportDto,
  FinancialMessageImportConfirmationResponseDto,
  FinancialMessageImportDetailResponseDto,
  FinancialMessageImportListResponseDto,
  ListFinancialMessageImportsQueryDto,
  UpdateFinancialMessageImportDto,
} from './financial-message-review.dto';
import { FinancialMessageReviewService } from './financial-message-review.service';
import { ShortcutImportAuthGuard } from './shortcut-import-auth.guard';
import type { AuthenticatedShortcutCredential } from './shortcut-import-auth.types';
import { ShortcutCredential } from './shortcut-import-credential.decorator';

@ApiTags('iPhone financial message imports')
@Controller('financial-message-imports')
export class FinancialMessageImportsController {
  constructor(
    private readonly imports: FinancialMessageImportsService,
    private readonly review: FinancialMessageReviewService,
  ) {}

  @Post('shortcut')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(ShortcutImportAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Import one iPhone Messages notification for later review.',
    description:
      'This endpoint accepts only a scoped iPhone Shortcut credential. It never creates a transaction, changes a balance, or changes Android SMS behavior.',
  })
  @ApiAcceptedResponse({ type: FinancialMessageImportResponseDto })
  @ApiUnauthorizedResponse({
    description: 'The Shortcut credential is invalid, expired, or revoked.',
  })
  ingest(
    @ShortcutCredential() credential: AuthenticatedShortcutCredential,
    @Body() body: CreateFinancialMessageImportDto,
  ): Promise<FinancialMessageImportResponseDto> {
    return this.imports.ingest(credential, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current user’s iPhone message imports.' })
  @ApiOkResponse({ type: FinancialMessageImportListResponseDto })
  list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListFinancialMessageImportsQueryDto,
  ): Promise<FinancialMessageImportListResponseDto> {
    return this.review.list(user.userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read one owned iPhone message import.' })
  @ApiOkResponse({ type: FinancialMessageImportDetailResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    return this.review.detail(user.userId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Correct one pending iPhone message import.' })
  @ApiOkResponse({ type: FinancialMessageImportDetailResponseDto })
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateFinancialMessageImportDto,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    return this.review.update(user.userId, id, body);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm an import and record the received payment atomically.',
  })
  @ApiOkResponse({ type: FinancialMessageImportConfirmationResponseDto })
  confirm(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ConfirmFinancialMessageImportDto,
  ): Promise<FinancialMessageImportConfirmationResponseDto> {
    return this.review.confirm(user.userId, id, body);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dismiss a pending import and purge its raw text.' })
  @ApiOkResponse({ type: FinancialMessageImportDetailResponseDto })
  dismiss(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<FinancialMessageImportDetailResponseDto> {
    return this.review.dismiss(user.userId, id);
  }
}
