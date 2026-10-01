import { Injectable } from '@nestjs/common';

import { RequestMetadata } from '../../../common/interfaces/request-metadata.interface';
import { UsersService } from '../../users/users.service';
import { UserProfileResponseDto } from '../../users/dto/user-profile-response.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LogoutRequestDto } from '../dto/logout.request.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';
import { RefreshTokenRequestDto } from '../dto/refresh-token.request.dto';
import { AuthMapper } from '../mappers/auth.mapper';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthSessionManagementService {
  constructor(
    private readonly tokenService: TokenService,

    private readonly sessionService: SessionService,

    private readonly usersService: UsersService,
  ) {}

  async refresh(
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
}
