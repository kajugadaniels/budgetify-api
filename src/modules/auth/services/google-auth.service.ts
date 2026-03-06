import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import { googleConfig } from '../../../config/google.config';
import { GoogleUserProfile } from '../interfaces/google-user-profile.interface';

const GOOGLE_ISSUERS = new Set([
  'https://accounts.google.com',
  'accounts.google.com',
]);

@Injectable()
export class GoogleAuthService {
  private readonly oauthClient = new OAuth2Client();

  constructor(
    @Inject(googleConfig.KEY)
    private readonly googleSettings: ConfigType<typeof googleConfig>,
  ) {}

  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const ticket = await this.oauthClient.verifyIdToken({
      idToken,
      audience: this.googleSettings.clientIds,
    });
    const payload = ticket.getPayload();

    this.assertValidPayload(payload);

    return {
      provider: AuthProvider.GOOGLE,
      providerUserId: payload.sub,
      email: payload.email!.toLowerCase(),
      isEmailVerified: Boolean(payload.email_verified),
      firstName: payload.given_name ?? null,
      lastName: payload.family_name ?? null,
      fullName: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    };
  }

  private assertValidPayload(
    payload: TokenPayload | undefined,
  ): asserts payload is TokenPayload {
    if (!payload) {
      throw new UnauthorizedException('Google token payload is missing.');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Google token subject is missing.');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Google token email is missing.');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'Google account email must be verified before sign-in.',
      );
    }

    if (!payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) {
      throw new UnauthorizedException('Google token issuer is invalid.');
    }

    if (!payload.aud || !this.googleSettings.clientIds.includes(payload.aud)) {
      throw new UnauthorizedException('Google token audience is invalid.');
    }

    if (!payload.exp || payload.exp * 1_000 <= Date.now()) {
      throw new UnauthorizedException('Google token has expired.');
    }
  }
}
