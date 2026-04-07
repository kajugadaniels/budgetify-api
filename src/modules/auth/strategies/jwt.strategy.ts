import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedRequestUser } from '../../../common/interfaces/authenticated-request.interface';
import { authConfig } from '../../../config/auth.config';
import { USERS_ROUTES } from '../../users/users.routes';
import { UsersService } from '../../users/users.service';
import { JwtAccessPayload } from '../interfaces/jwt-access-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    authSettings: ConfigType<typeof authConfig>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authSettings.jwt.accessSecret,
      issuer: authSettings.issuer,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: JwtAccessPayload,
  ): Promise<AuthenticatedRequestUser> {
    if (
      payload.type !== 'access' ||
      !payload.sub ||
      !payload.email ||
      !payload.sessionId
    ) {
      throw new UnauthorizedException('Access token payload is invalid.');
    }

    const requestPath = request.originalUrl ?? request.url ?? '';
    const isDeletionRequestRoute =
      request.method === 'POST' &&
      requestPath.includes(`/users/${USERS_ROUTES.deletionRequest}`);

    if (isDeletionRequestRoute) {
      await this.usersService.findActiveByIdOrThrow(payload.sub);
    } else {
      await this.usersService.recordAuthenticatedActivityOrThrow(payload.sub);
    }

    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      email: payload.email,
      tokenType: 'access',
    };
  }
}
