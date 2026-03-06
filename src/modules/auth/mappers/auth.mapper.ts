import { User } from '@prisma/client';

import { AuthResponseDto } from '../dto/auth-response.dto';
import { TokenPair } from '../interfaces/token-pair.interface';
import { UserProfileResponseDto } from '../../users/dto/user-profile-response.dto';

export abstract class AuthMapper {
  static toUserResponse(user: User): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toAuthResponse(user: User, tokens: TokenPair): AuthResponseDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      user: this.toUserResponse(user),
    };
  }
}
