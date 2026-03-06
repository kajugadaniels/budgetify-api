import { Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';

import { RequestMetadata } from '../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutRequestDto } from './dto/logout.request.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenRequestDto } from './dto/refresh-token.request.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { GoogleAuthRequestDto } from './dto/google-auth.request.dto';
import { GoogleAuthService } from './services/google-auth.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
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
  ) {}

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
          data: {
            providerEmail: googleProfile.email,
          },
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
