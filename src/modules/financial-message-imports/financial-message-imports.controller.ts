import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import {
  CreateFinancialMessageImportDto,
  FinancialMessageImportResponseDto,
} from './financial-message-import.dto';
import { FinancialMessageImportsService } from './financial-message-imports.service';
import { ShortcutImportAuthGuard } from './shortcut-import-auth.guard';
import type { AuthenticatedShortcutCredential } from './shortcut-import-auth.types';
import { ShortcutCredential } from './shortcut-import-credential.decorator';

@ApiTags('iPhone financial message imports')
@Controller('financial-message-imports')
export class FinancialMessageImportsController {
  constructor(private readonly imports: FinancialMessageImportsService) {}

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
}
