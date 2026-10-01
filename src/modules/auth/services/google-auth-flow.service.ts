import { Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';

import { RequestMetadata } from '../../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { UsersService } from '../../users/users.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { GoogleAuthRequestDto } from '../dto/google-auth.request.dto';
import { GoogleUserProfile } from '../interfaces/google-user-profile.interface';
import { AuthMapper } from '../mappers/auth.mapper';
import { GoogleAuthService } from './google-auth.service';
import { SessionService } from './session.service';

type AuthIdentityWithUser = Prisma.AuthIdentityGetPayload<{
  include: {
    user: true;
  };
}>;

@Injectable()
export class GoogleAuthFlowService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly googleAuthService: GoogleAuthService,

    private readonly usersService: UsersService,

    private readonly sessionService: SessionService,
  ) {}

  async authenticate(
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

        include: {
          user: true,
        },
      });

      const user = await this.resolveUser(identity, googleProfile, tx);

      await this.upsertIdentity(identity, user, googleProfile, tx);

      const tokens = await this.sessionService.createAuthenticatedSession({
        user,

        metadata,

        db: tx,
      });

      return {
        user,

        tokens,
      };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  private async resolveUser(
    identity: AuthIdentityWithUser | null,
    profile: GoogleUserProfile,
    tx: Prisma.TransactionClient,
  ): Promise<User> {
    if (identity) {
      return this.usersService.updateFromGoogleLogin(
        identity.user,
        profile,
        tx,
      );
    }

    const existingUser = await this.usersService.findActiveByEmail(
      profile.email,
      tx,
    );

    if (existingUser) {
      return this.usersService.updateFromGoogleLogin(existingUser, profile, tx);
    }

    return this.usersService.createFromGoogleProfile(profile, tx);
  }

  private async upsertIdentity(
    identity: AuthIdentityWithUser | null,
    user: User,
    profile: GoogleUserProfile,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (identity) {
      await tx.authIdentity.update({
        where: {
          id: identity.id,
        },

        data: {
          providerEmail: profile.email,
        },
      });

      return;
    }

    await tx.authIdentity.create({
      data: {
        userId: user.id,

        provider: AuthProvider.GOOGLE,

        providerUserId: profile.providerUserId,

        providerEmail: profile.email,
      },
    });
  }
}
