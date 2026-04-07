import { Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';

import { RequestMetadata } from '../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailInitiateRequestDto } from './dto/email-initiate.request.dto';
import { EmailInitiateResponseDto } from './dto/email-initiate-response.dto';
import { EmailVerifyRequestDto } from './dto/email-verify.request.dto';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { GoogleAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { EmailService } from '../email/email.service';
import { UserProfileResponseDto } from '../users/dto/user-profile-response.dto';

type AuthIdentityWithUser = Prisma.AuthIdentityGetPayload<{
  include: { user: true };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  async authenticateWithGoogle(
    payload: GoogleAuthRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const googleProfile = await this.googleAuthService.verifyIdToken(
      payload.idToken,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const identity = await tx.authIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: AuthProvider.GOOGLE,
            providerUserId: googleProfile.providerUserId,
          },
        },
        include: { user: true },
      });

      const user = await this.resolveUserForGoogleLogin(
        identity,
        googleProfile,
        tx,
      );

      if (identity) {
        await tx.authIdentity.update({
          where: { id: identity.id },
          data: { providerEmail: googleProfile.email },
        });
      } else {
        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: AuthProvider.GOOGLE,
            providerUserId: googleProfile.providerUserId,
            providerEmail: googleProfile.email,
          },
        });
      }

      const tokens = await this.sessionService.createAuthenticatedSession({
        user,
        metadata,
        db: tx,
      });

      return { user, tokens };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  // ── Email OTP: step 1 ────────────────────────────────────────────────────────

  /**
   * Accepts an email, determines whether it belongs to a known user or a
   * first-time visitor, and dispatches the appropriate OTP email.
   *
   * The response "action" field tells the client which screen to show next:
   *   - "login"    → existing account, sign-in OTP sent
   *   - "register" → new address, onboarding OTP sent
   */
  async initiateEmailAuth(
    payload: EmailInitiateRequestDto,
    metadata: RequestMetadata,
  ): Promise<EmailInitiateResponseDto> {
    void metadata;
    const email = payload.email.toLowerCase().trim();
    const existingUser = await this.usersService.findActiveByEmail(
      email,
      undefined,
      {
        cancelPendingDeletionOnActivity: true,
      },
    );

    if (existingUser) {
      const otp = await this.otpService.createLoginChallenge(existingUser.id);
      await this.emailService.sendOtpLoginEmail(
        email,
        otp,
        existingUser.firstName,
      );

      const maskedEmail = maskEmail(email);
      return {
        action: 'login',
        maskedEmail,
        message: `A sign-in code has been sent to ${maskedEmail}.`,
      };
    }

    const otp = await this.otpService.createRegisterChallenge(email);
    await this.emailService.sendOtpRegisterEmail(email, otp);

    const maskedEmail = maskEmail(email);
    return {
      action: 'register',
      maskedEmail,
      message: `Welcome! A verification code has been sent to ${maskedEmail}.`,
    };
  }

  // ── Email OTP: step 2 ────────────────────────────────────────────────────────

  /**
   * Validates the 6-digit OTP, then either:
   *   - Creates a session for an existing user (login), or
   *   - Creates the full User account and a session (registration).
   *
   * All database writes are performed inside a single transaction so the
   * system never ends up in a half-created state.
   */
  async verifyEmailOtp(
    payload: EmailVerifyRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = payload.email.toLowerCase().trim();
    const existingUser = await this.usersService.findActiveByEmail(
      email,
      undefined,
      {
        cancelPendingDeletionOnActivity: true,
      },
    );

    if (existingUser) {
      return this.completeLoginWithOtp(existingUser, payload.otp, metadata);
    }

    return this.completeRegistrationWithOtp(email, payload.otp, metadata);
  }

  // ── Token management ─────────────────────────────────────────────────────────

  async refreshTokens(
    payload: RefreshTokenRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const refreshPayload = await this.tokenService.verifyRefreshToken(
      payload.refreshToken,
    );
    const result = await this.sessionService.rotateRefreshToken(
      refreshPayload,
      payload.refreshToken,
      metadata,
    );

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  async logout(payload: LogoutRequestDto): Promise<LogoutResponseDto> {
    const refreshPayload = await this.tokenService.verifyRefreshToken(
      payload.refreshToken,
    );

    await this.sessionService.revokeRefreshToken(
      refreshPayload,
      payload.refreshToken,
    );

    return {
      success: true,
      message: 'Session revoked successfully.',
    };
  }

  async getAuthenticatedUser(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.usersService.findActiveByIdOrThrow(userId);

    return AuthMapper.toUserResponse(user);
  }

  // ── Private: email OTP helpers ───────────────────────────────────────────────

  /**
   * Validates the login OTP and opens a new authenticated session.
   * The LoginOtpChallenge is deleted inside the transaction.
   */
  private async completeLoginWithOtp(
    user: User,
    otp: string,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.otpService.consumeLoginChallenge(user.id, otp, tx);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          accountDeletionRequestedAt: null,
          accountDeletionScheduledFor: null,
        },
      });

      const tokens = await this.sessionService.createAuthenticatedSession({
        user: updatedUser,
        metadata,
        db: tx,
      });

      return { user: updatedUser, tokens };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  /**
   * Validates the registration OTP, creates the User + AuthIdentity, and
   * opens the first authenticated session — all inside one transaction.
   */
  private async completeRegistrationWithOtp(
    email: string,
    otp: string,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Validate & delete the PendingUser row atomically.
      await this.otpService.consumeRegisterChallenge(email, otp, tx);

      // Promote the pending email to a full verified user.
      const newUser = await this.usersService.createFromEmailVerification(
        email,
        tx,
      );

      // Link the EMAIL auth identity so future logins can find this record.
      await tx.authIdentity.create({
        data: {
          userId: newUser.id,
          provider: AuthProvider.EMAIL,
          providerUserId: email,
          providerEmail: email,
        },
      });

      const tokens = await this.sessionService.createAuthenticatedSession({
        user: newUser,
        metadata,
        db: tx,
      });

      return { user: newUser, tokens };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  // ── Private: Google helpers ──────────────────────────────────────────────────

  private async resolveUserForGoogleLogin(
    identity: AuthIdentityWithUser | null,
    googleProfile: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      fullName: string | null;
      avatarUrl: string | null;
      isEmailVerified: boolean;
    },
    tx: Prisma.TransactionClient,
  ): Promise<User> {
    if (identity) {
      return this.usersService.updateFromGoogleLogin(
        identity.user,
        googleProfile,
        tx,
      );
    }

    const existingUser = await this.usersService.findActiveByEmail(
      googleProfile.email,
      tx,
    );

    if (existingUser) {
      return this.usersService.updateFromGoogleLogin(
        existingUser,
        googleProfile,
        tx,
      );
    }

    return this.usersService.createFromGoogleProfile(googleProfile, tx);
  }
}

// ── Module-private utility ────────────────────────────────────────────────────

/**
 * Masks the local part of an email address for safe display in responses and
 * logs. Preserves the first and last character of the local part.
 *
 * Examples:
 *   alice.mutoni@example.com  →  a***i@example.com
 *   jo@example.com            →  j***o@example.com
 *   a@example.com             →  a***@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');

  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }

  return `${local[0]}${'*'.repeat(3)}${local[local.length - 1]}@${domain}`;
}
