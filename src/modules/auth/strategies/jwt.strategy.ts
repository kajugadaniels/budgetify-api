import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { ConfigType } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedRequestUser } from '../../../common/interfaces/authenticated-request.interface';
import { authConfig } from '../../../config/auth.config';
import { JwtAccessPayload } from '../interfaces/jwt-access-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    authSettings: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authSettings.jwt.accessSecret,
      issuer: authSettings.issuer,
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedRequestUser {
    if (
      payload.type !== 'access' ||
      !payload.sub ||
      !payload.email ||
      !payload.sessionId
    ) {
      throw new UnauthorizedException('Access token payload is invalid.');
    }

    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      email: payload.email,
      tokenType: 'access',
    };
  }
}
