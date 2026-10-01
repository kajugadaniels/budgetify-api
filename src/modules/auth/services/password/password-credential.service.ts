import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma/prisma.service';
import { SetPasswordRequestDto } from '../../dto/set-password.request.dto';
import { SetPasswordResponseDto } from '../../dto/set-password-response.dto';
import { PasswordCredentialRepository } from '../../repositories/password-credential.repository';
import { SessionService } from '../session.service';
import { PasswordCryptoService } from './password-crypto.service';
import { PasswordSetupGrantService } from './password-setup-grant.service';

@Injectable()
export class PasswordCredentialService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly cryptoService: PasswordCryptoService,

    private readonly grantService: PasswordSetupGrantService,

    private readonly credentialRepository: PasswordCredentialRepository,

    private readonly sessionService: SessionService,
  ) {}

  async setPassword(
    payload: SetPasswordRequestDto,
  ): Promise<SetPasswordResponseDto> {
    if (payload.password !== payload.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const passwordMaterial = await this.cryptoService.hash(payload.password);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const grant = await this.grantService.consume(
        payload.grantToken,
        now,
        tx,
      );

      await this.credentialRepository.upsert(
        grant.userId,
        passwordMaterial,
        now,
        tx,
      );

      // Creating or resetting a password invalidates
      // all pre-existing authenticated sessions.
      await this.sessionService.revokeAllForUser(grant.userId, now, tx);
    });

    return {
      success: true,

      message: 'Password saved. You can now sign in.',
    };
  }
}
