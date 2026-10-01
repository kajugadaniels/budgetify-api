import { Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestMetadata } from '../../../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../../../database/prisma/prisma.service';
import { UsersService } from '../../../users/users.service';
import { AuthResponseDto } from '../../dto/auth-response.dto';
import { PasswordLoginRequestDto } from '../../dto/password-login.request.dto';
import { AuthMapper } from '../../mappers/auth.mapper';
import { PasswordCredentialRepository } from '../../repositories/password-credential.repository';
import { normalizeAuthEmail } from '../../utils/auth-email.util';
import { SessionService } from '../session.service';
import { PasswordCryptoService } from './password-crypto.service';

@Injectable()
export class PasswordLoginService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly usersService: UsersService,

    private readonly credentialRepository: PasswordCredentialRepository,

    private readonly cryptoService: PasswordCryptoService,

    private readonly sessionService: SessionService,
  ) {}

  async authenticate(
    payload: PasswordLoginRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = normalizeAuthEmail(payload.email);

    const user = await this.usersService.findActiveByEmail(email, undefined, {
      cancelPendingDeletionOnActivity: true,
    });

    const credential = user
      ? await this.credentialRepository.findByUserId(user.id)
      : null;

    const matches = await this.cryptoService.matches(
      payload.password,
      credential,
    );

    if (!user || !credential || !matches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },

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

      return {
        user: updatedUser,

        tokens,
      };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }
}
