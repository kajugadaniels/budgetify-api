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
import { AUTH_ROUTES } from './auth.routes';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailInitiateRequestDto } from './dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from './dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from './dto/email-verify.request.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  ApiLogoutEndpoint,
  ApiMeEndpoint,
  ApiRefreshEndpoint,
} from './swagger/auth-session.swagger';
import {
  ApiEmailInitiateEndpoint,
  ApiEmailVerifyEndpoint,
} from './swagger/email-auth.swagger';
import { ApiGoogleAuthEndpoint } from './swagger/google-auth.swagger';

@ApiTags('Auth')
@Controller(AUTH_ROUTES.base)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(AUTH_ROUTES.google)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @ApiGoogleAuthEndpoint()
  async authenticateWithGoogle(
    @Body()
    body: GoogleAuthRequestDto,

    @Req()
    request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.authenticateWithGoogle(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post(AUTH_ROUTES.email.initiate)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    otp: {
      limit: 3,
      ttl: 900_000,
    },
  })
  @ApiEmailInitiateEndpoint()
  async initiateEmailAuth(
    @Body()
    body: EmailInitiateRequestDto,

    @Req()
    request: Request,
  ): Promise<EmailInitiateResponseDto> {
    return this.authService.initiateEmailAuth(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post(AUTH_ROUTES.email.verify)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @ApiEmailVerifyEndpoint()
  async verifyEmailOtp(
    @Body()
    body: EmailVerifyRequestDto,

    @Req()
    request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyEmailOtp(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post(AUTH_ROUTES.refresh)
  @HttpCode(HttpStatus.OK)
  @ApiRefreshEndpoint()
  async refreshTokens(
    @Body()
    body: RefreshTokenRequestDto,

    @Req()
    request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(
      body,
      extractRequestMetadata(request),
    );
  }

  @Post(AUTH_ROUTES.logout)
  @HttpCode(HttpStatus.OK)
  @ApiLogoutEndpoint()
  async logout(
    @Body()
    body: LogoutRequestDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(body);
  }

  @Get(AUTH_ROUTES.me)
  @UseGuards(JwtAuthGuard)
  @ApiMeEndpoint()
  async me(
    @CurrentUser()
    user: AuthenticatedRequestUser,
  ): Promise<UserProfileResponseDto> {
    return this.authService.getAuthenticatedUser(user.userId);
  }
}
