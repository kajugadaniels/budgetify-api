import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { extractRequestMetadata } from '../../common/utils/request.util';
import { UserProfileResponseDto } from '../users/dto/user-profile-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import {
  ApiGoogleAuthEndpoint,
  ApiLogoutEndpoint,
  ApiMeEndpoint,
  ApiRefreshEndpoint,
} from './auth.swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiGoogleAuthEndpoint()
  async authenticateWithGoogle(
    @Body() body: GoogleAuthRequestDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.authenticateWithGoogle(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiRefreshEndpoint()
  async refreshTokens(
    @Body() body: RefreshTokenRequestDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiLogoutEndpoint()
  async logout(@Body() body: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.authService.logout(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiMeEndpoint()
  async me(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<UserProfileResponseDto> {
    return this.authService.getAuthenticatedUser(user.userId);
  }
}
