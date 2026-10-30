import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatedShortcutImportCredentialResponseDto,
  CreateShortcutImportCredentialDto,
  ShortcutImportCredentialResponseDto,
} from './shortcut-import-credential.dto';
import { ShortcutImportCredentialsService } from './shortcut-import-credentials.service';

@ApiTags('iPhone Shortcut imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shortcut-import-credentials')
export class ShortcutImportCredentialsController {
  constructor(private readonly credentials: ShortcutImportCredentialsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a one-time credential for an iPhone Shortcut.',
    description:
      'The returned token is shown once and is intended only for an Apple Shortcut. Android message access is not changed by this endpoint.',
  })
  @ApiCreatedResponse({ type: CreatedShortcutImportCredentialResponseDto })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateShortcutImportCredentialDto,
  ) {
    return this.credentials.create(user.userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s iPhone credentials.' })
  @ApiOkResponse({ type: ShortcutImportCredentialResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.credentials.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an iPhone Shortcut credential.' })
  @ApiNoContentResponse()
  async revoke(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.credentials.revoke(user.userId, id);
  }
}
