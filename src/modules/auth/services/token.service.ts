import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { TokenType } from '../../../common/enums/token-type.enum';
import {
  buildExpirationDate,
  parseDurationToSeconds,
} from '../../../common/utils/duration.util';
import { authConfig } from '../../../config/auth.config';
import { JwtAccessPayload } from '../interfaces/jwt-access-payload.interface';
import { JwtRefreshPayload } from '../interfaces/jwt-refresh-payload.interface';
import { TokenPair } from '../interfaces/token-pair.interface';

interface TokenSubject {
  userId: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authSettings: ConfigType<typeof authConfig>,
  ) {}

  async createTokenPair(
    user: TokenSubject,
    sessionId: string,
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync<JwtAccessPayload>(
        {
          sub: user.userId,
          email: user.email,
          sessionId,
          type: 'access',
        },
        {
          secret: this.authSettings.jwt.accessSecret,
          expiresIn: parseDurationToSeconds(
            this.authSettings.jwt.accessExpiresIn,
          ),
          issuer: this.authSettings.issuer,
        },
      ),
      this.jwtService.signAsync<JwtRefreshPayload>(
        {
          sub: user.userId,
          sessionId,
          type: 'refresh',
          jti: randomUUID(),
        },
        {
          secret: this.authSettings.jwt.refreshSecret,
          expiresIn: parseDurationToSeconds(
            this.authSettings.jwt.refreshExpiresIn,
          ),
          issuer: this.authSettings.issuer,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseDurationToSeconds(this.authSettings.jwt.accessExpiresIn),
      tokenType: this.authSettings.tokenType,
      refreshTokenExpiresAt: buildExpirationDate(
        this.authSettings.jwt.refreshExpiresIn,
      ),
    };
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        token,
        {
          secret: this.authSettings.jwt.refreshSecret,
          issuer: this.authSettings.issuer,
        },
      );

      if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.sessionId ||
        !payload.jti
      ) {
        throw new UnauthorizedException('Invalid refresh token payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.authSettings.jwt.refreshSecret)
      .update(token)
      .digest('hex');
  }

  matchesRefreshToken(token: string, storedHash: string): boolean {
    const candidateHash = this.hashRefreshToken(token);
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const candidateBuffer = Buffer.from(candidateHash, 'hex');

    if (storedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, candidateBuffer);
  }

  getTokenType(): TokenType {
    return this.authSettings.tokenType;
  }
}
