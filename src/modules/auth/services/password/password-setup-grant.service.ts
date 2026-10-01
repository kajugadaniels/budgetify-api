import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordSetupGrant, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

import { PasswordSetupGrantRepository } from '../../repositories/password-setup-grant.repository';

const PASSWORD_GRANT_LIFETIME_SECONDS = 10 * 60;

export interface IssuedPasswordSetupGrant {
  grantToken: string;

  expiresIn: number;
}

@Injectable()
export class PasswordSetupGrantService {
  constructor(private readonly grantRepository: PasswordSetupGrantRepository) {}

  async issue(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<IssuedPasswordSetupGrant> {
    const rawToken = randomBytes(32).toString('base64url');

    const tokenHash = this.hashToken(rawToken);

    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + PASSWORD_GRANT_LIFETIME_SECONDS * 1000,
    );

    await this.grantRepository.invalidateActiveForUser(userId, now, tx);

    await this.grantRepository.create(userId, tokenHash, expiresAt, tx);

    return {
      grantToken: rawToken,

      expiresIn: PASSWORD_GRANT_LIFETIME_SECONDS,
    };
  }

  async consume(
    rawToken: string,
    now: Date,
    tx: Prisma.TransactionClient,
  ): Promise<PasswordSetupGrant> {
    const grant = await this.grantRepository.findByTokenHash(
      this.hashToken(rawToken),
      tx,
    );

    if (!grant || grant.consumedAt || grant.expiresAt <= now) {
      throw new UnauthorizedException(
        'Password setup authorization is invalid or expired.',
      );
    }

    const consumed = await this.grantRepository.consumeIfActive(
      grant.id,
      now,
      tx,
    );

    if (!consumed) {
      throw new UnauthorizedException(
        'Password setup authorization is invalid or expired.',
      );
    }

    return grant;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
