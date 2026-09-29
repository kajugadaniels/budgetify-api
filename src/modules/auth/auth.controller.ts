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
import { EmailInitiateRequestDto } from './dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from './dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from './dto/email-verify.request.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { PasswordChallengeResponseDto } from './dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from './dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from './dto/password-challenge-verify-response.dto';
import { PasswordLoginRequestDto } from './dto/password-login.request.dto';
import { PasswordStatusRequestDto } from './dto/password-status.request.dto';
import { PasswordStatusResponseDto } from './dto/password-status-response.dto';
import { SetPasswordRequestDto } from './dto/set-password.request.dto';
import { SetPasswordResponseDto } from './dto/set-password-response.dto';
import {
  ApiEmailInitiateEndpoint,
  ApiEmailVerifyEndpoint,
  ApiGoogleAuthEndpoint,
  ApiLogoutEndpoint,
  ApiMeEndpoint,
  ApiPasswordChallengeEndpoint,
  ApiPasswordChallengeVerifyEndpoint,
  ApiPasswordLoginEndpoint,
  ApiPasswordStatusEndpoint,
  ApiRefreshEndpoint,
  ApiSetPasswordEndpoint,
} from './auth.swagger';
import { AUTH_ROUTES } from './auth.routes';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordAuthService } from './services/password-auth.service';

@ApiTags('Auth')
@Controller(AUTH_ROUTES.base)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordAuthService: PasswordAuthService,
  ) {}

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  @Post(AUTH_ROUTES.google)
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

  // ── Email OTP ────────────────────────────────────────────────────────────────

  /**
   * Step 1 — submit email.
   * Rate-limited to 3 requests per 15 minutes to prevent OTP flooding.
   */
  @Post(AUTH_ROUTES.email.initiate)
  @HttpCode(HttpStatus.OK)
  @Throttle({ otp: { limit: 3, ttl: 900_000 } })
  @ApiEmailInitiateEndpoint()
  async initiateEmailAuth(
    @Body() body: EmailInitiateRequestDto,
    @Req() request: Request,
  ): Promise<EmailInitiateResponseDto> {
    return this.authService.initiateEmailAuth(
      body,
      extractRequestMetadata(request),
    );
  }

  /**
   * Step 2 — submit OTP.
   * Returns full JWT tokens on success (same shape as Google auth).
   */
  @Post(AUTH_ROUTES.email.verify)
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiEmailVerifyEndpoint()
  async verifyEmailOtp(
    @Body() body: EmailVerifyRequestDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyEmailOtp(
      body,
      extractRequestMetadata(request),
    );
  }

  // ── Password authentication ───────────────────────────────────────────────

  @Post(AUTH_ROUTES.password.status)
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiPasswordStatusEndpoint()
  async getPasswordStatus(
    @Body() body: PasswordStatusRequestDto,
  ): Promise<PasswordStatusResponseDto> {
    return this.passwordAuthService.getPasswordStatus(body.email);
  }

  @Post(AUTH_ROUTES.password.challenge)
  @HttpCode(HttpStatus.OK)
  @Throttle({ otp: { limit: 3, ttl: 900_000 } })
  @ApiPasswordChallengeEndpoint()
  async requestPasswordChallenge(
    @Body() body: PasswordStatusRequestDto,
  ): Promise<PasswordChallengeResponseDto> {
    return this.passwordAuthService.requestPasswordChallenge(body.email);
  }

  @Post(AUTH_ROUTES.password.verifyChallenge)
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiPasswordChallengeVerifyEndpoint()
  async verifyPasswordChallenge(
    @Body() body: PasswordChallengeVerifyRequestDto,
  ): Promise<PasswordChallengeVerifyResponseDto> {
    return this.passwordAuthService.verifyPasswordChallenge(body);
  }

  @Post(AUTH_ROUTES.password.set)
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiSetPasswordEndpoint()
  async setPassword(
    @Body() body: SetPasswordRequestDto,
  ): Promise<SetPasswordResponseDto> {
    return this.passwordAuthService.setPassword(body);
  }

  @Post(AUTH_ROUTES.password.login)
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiPasswordLoginEndpoint()
  async loginWithPassword(
    @Body() body: PasswordLoginRequestDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.passwordAuthService.authenticateWithPassword(
      body,
      extractRequestMetadata(request),
    );
  }

  // ── Token management ─────────────────────────────────────────────────────────

  @Post(AUTH_ROUTES.refresh)
  @HttpCode(HttpStatus.OK)
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

  @Post(AUTH_ROUTES.logout)
  @HttpCode(HttpStatus.OK)
  @ApiLogoutEndpoint()
  async logout(@Body() body: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.authService.logout(body);
  }

  // ── Authenticated endpoints ──────────────────────────────────────────────────

  @Get(AUTH_ROUTES.me)
  @UseGuards(JwtAuthGuard)
  @ApiMeEndpoint()
  async me(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<UserProfileResponseDto> {
    return this.authService.getAuthenticatedUser(user.userId);
  }
}
