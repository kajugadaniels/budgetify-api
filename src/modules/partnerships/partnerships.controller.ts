import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { appConfig } from '../../config/app.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcceptInviteRequestDto } from './dto/accept-invite.request.dto';
import { InvitePartnerRequestDto } from './dto/invite-partner.request.dto';
import { InviteInfoResponseDto } from './dto/invite-info.response.dto';
import { PartnershipResponseDto } from './dto/partnership-response.dto';
import { PartnershipsService } from './partnerships.service';
import { PARTNERSHIPS_ROUTES } from './partnerships.routes';

@ApiTags('Partnerships')
@Controller()
export class PartnershipsController {
  constructor(
    private readonly partnershipsService: PartnershipsService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Get(PARTNERSHIPS_ROUTES.mine)
  @UseGuards(JwtAuthGuard)
  async getMyPartnership(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<PartnershipResponseDto | null> {
    return this.partnershipsService.getMyPartnership(user.userId);
  }

  @Post(PARTNERSHIPS_ROUTES.invite)
  @UseGuards(JwtAuthGuard)
  async invitePartner(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: InvitePartnerRequestDto,
  ): Promise<PartnershipResponseDto> {
    return this.partnershipsService.invitePartner(
      user.userId,
      body,
      this.config.frontendUrl,
      this.config.mobileAppInviteUrl,
    );
  }

  @Get(PARTNERSHIPS_ROUTES.inviteInfo)
  async getInviteInfo(
    @Query('token') token: string,
  ): Promise<InviteInfoResponseDto> {
    return this.partnershipsService.getInviteInfo(token);
  }

  @Post(PARTNERSHIPS_ROUTES.accept)
  @UseGuards(JwtAuthGuard)
  async acceptInvite(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: AcceptInviteRequestDto,
  ): Promise<PartnershipResponseDto> {
    return this.partnershipsService.acceptInvite(user.userId, body);
  }

  @Delete(PARTNERSHIPS_ROUTES.mine)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async removePartnership(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<void> {
    return this.partnershipsService.removeMine(user.userId);
  }

  @Delete(PARTNERSHIPS_ROUTES.invite)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async cancelPendingInvite(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<void> {
    return this.partnershipsService.cancelPendingInvite(user.userId);
  }
}
