import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { extractRequestMetadata } from '../../common/utils/request.util';
import { AUTH_ROUTES } from './auth.routes';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PasswordChallengeResponseDto } from './dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from './dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from './dto/password-challenge-verify-response.dto';
import { PasswordLoginRequestDto } from './dto/password-login.request.dto';
import { PasswordStatusRequestDto } from './dto/password-status.request.dto';
import { PasswordStatusResponseDto } from './dto/password-status-response.dto';
import { SetPasswordRequestDto } from './dto/set-password.request.dto';
import { SetPasswordResponseDto } from './dto/set-password-response.dto';
import { PasswordAuthService } from './services/password-auth.service';
import {
  ApiPasswordChallengeEndpoint,
  ApiPasswordChallengeVerifyEndpoint,
  ApiPasswordLoginEndpoint,
  ApiPasswordStatusEndpoint,
  ApiSetPasswordEndpoint,
} from './swagger/password-auth.swagger';

@ApiTags('Auth')
@Controller(AUTH_ROUTES.base)
export class PasswordAuthController {
  constructor(private readonly passwordAuthService: PasswordAuthService) {}

  @Post(AUTH_ROUTES.password.status)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 10,

      ttl: 60_000,
    },
  })
  @ApiPasswordStatusEndpoint()
  async getPasswordStatus(
    @Body()
    body: PasswordStatusRequestDto,
  ): Promise<PasswordStatusResponseDto> {
    return this.passwordAuthService.getPasswordStatus(body.email);
  }

  @Post(AUTH_ROUTES.password.challenge)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    otp: {
      limit: 3,

      ttl: 900_000,
    },
  })
  @ApiPasswordChallengeEndpoint()
  async requestPasswordChallenge(
    @Body()
    body: PasswordStatusRequestDto,
  ): Promise<PasswordChallengeResponseDto> {
    return this.passwordAuthService.requestPasswordChallenge(body.email);
  }

  @Post(AUTH_ROUTES.password.verifyChallenge)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 10,

      ttl: 60_000,
    },
  })
  @ApiPasswordChallengeVerifyEndpoint()
  async verifyPasswordChallenge(
    @Body()
    body: PasswordChallengeVerifyRequestDto,
  ): Promise<PasswordChallengeVerifyResponseDto> {
    return this.passwordAuthService.verifyPasswordChallenge(body);
  }

  @Post(AUTH_ROUTES.password.set)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 5,

      ttl: 60_000,
    },
  })
  @ApiSetPasswordEndpoint()
  async setPassword(
    @Body()
    body: SetPasswordRequestDto,
  ): Promise<SetPasswordResponseDto> {
    return this.passwordAuthService.setPassword(body);
  }

  @Post(AUTH_ROUTES.password.login)
  @HttpCode(HttpStatus.OK)
  @Throttle({
    auth: {
      limit: 5,

      ttl: 60_000,
    },
  })
  @ApiPasswordLoginEndpoint()
  async loginWithPassword(
    @Body()
    body: PasswordLoginRequestDto,

    @Req()
    request: Request,
  ): Promise<AuthResponseDto> {
    return this.passwordAuthService.authenticateWithPassword(
      body,
      extractRequestMetadata(request),
    );
  }
}
