import { Injectable } from '@nestjs/common';

import { RequestMetadata } from '../../common/interfaces/request-metadata.interface';
import { UserProfileResponseDto } from '../users/dto/user-profile-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailInitiateRequestDto } from './dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from './dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from './dto/email-verify.request.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { AuthSessionManagementService } from './services/auth-session-management.service';
import { EmailOtpAuthService } from './services/email-otp-auth.service';
import { GoogleAuthFlowService } from './services/google-auth-flow.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly googleAuthFlowService: GoogleAuthFlowService,

    private readonly emailOtpAuthService: EmailOtpAuthService,

    private readonly sessionManagementService: AuthSessionManagementService,
  ) {}

  authenticateWithGoogle(
    payload: GoogleAuthRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    return this.googleAuthFlowService.authenticate(payload, metadata);
  }

  initiateEmailAuth(
    payload: EmailInitiateRequestDto,
    metadata: RequestMetadata,
  ): Promise<EmailInitiateResponseDto> {
    void metadata;

    return this.emailOtpAuthService.initiate(payload);
  }

  verifyEmailOtp(
    payload: EmailVerifyRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    return this.emailOtpAuthService.verify(payload, metadata);
  }

  refreshTokens(
    payload: RefreshTokenRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    return this.sessionManagementService.refresh(payload, metadata);
  }

  logout(payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    return this.sessionManagementService.logout(payload);
  }

  getAuthenticatedUser(userId: string): Promise<UserProfileResponseDto> {
    return this.sessionManagementService.getAuthenticatedUser(userId);
  }
}
