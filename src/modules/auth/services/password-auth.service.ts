import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, User } from '@prisma/client';
import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';

import { RequestMetadata } from '../../../common/interfaces/request-metadata.interface';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { PasswordChallengeResponseDto } from '../dto/password-challenge-response.dto';
import { PasswordChallengeVerifyRequestDto } from '../dto/password-challenge-verify.request.dto';
import { PasswordChallengeVerifyResponseDto } from '../dto/password-challenge-verify-response.dto';
import { PasswordLoginRequestDto } from '../dto/password-login.request.dto';
import { PasswordStatusResponseDto } from '../dto/password-status-response.dto';
import { SetPasswordRequestDto } from '../dto/set-password.request.dto';
import { SetPasswordResponseDto } from '../dto/set-password-response.dto';
import { AuthMapper } from '../mappers/auth.mapper';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_GRANT_LIFETIME_SECONDS = 10 * 60;
const SCRYPT_OPTIONS = {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;
const DUMMY_PASSWORD_SALT = Buffer.alloc(16, 7).toString('base64');
const DUMMY_PASSWORD_HASH = Buffer.alloc(PASSWORD_KEY_LENGTH, 3).toString(
  'base64',
);

@Injectable()
export class PasswordAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
  ) {}

  async getPasswordStatus(
    emailValue: string,
  ): Promise<PasswordStatusResponseDto> {
    const email = normalizeEmail(emailValue);
    const user = await this.usersService.findActiveByEmail(email);

    if (!user) {
      return { hasPassword: false };
    }

    const credential = await this.prisma.userPassword.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    return { hasPassword: credential !== null };
  }

  async requestPasswordChallenge(
    emailValue: string,
  ): Promise<PasswordChallengeResponseDto> {
    const email = normalizeEmail(emailValue);
    const user = await this.usersService.findActiveByEmail(email);

    if (user) {
      const otp = await this.otpService.createLoginChallenge(user.id);
      const credential = await this.prisma.userPassword.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      await this.emailService.sendPasswordOtpEmail(
        email,
        otp,
        user.firstName,
        credential !== null,
      );
    } else {
      const otp = await this.otpService.createRegisterChallenge(email);
      await this.emailService.sendPasswordOtpEmail(email, otp, null, false);
    }

    return {
      maskedEmail: maskEmail(email),
      message: `A verification code has been sent to ${maskEmail(email)}.`,
    };
  }

  async verifyPasswordChallenge(
    payload: PasswordChallengeVerifyRequestDto,
  ): Promise<PasswordChallengeVerifyResponseDto> {
    const email = normalizeEmail(payload.email);
    const rawGrantToken = randomBytes(32).toString('base64url');
    const tokenHash = hashGrantToken(rawGrantToken);
    const expiresAt = new Date(
      Date.now() + PASSWORD_GRANT_LIFETIME_SECONDS * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      let user = await this.usersService.findActiveByEmail(email, tx, {
        cancelPendingDeletionOnActivity: true,
      });

      if (user) {
        await this.otpService.consumeLoginChallenge(user.id, payload.otp, tx);
      } else {
        await this.otpService.consumeRegisterChallenge(email, payload.otp, tx);
        user = await this.usersService.createFromEmailVerification(email, tx);
        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: AuthProvider.EMAIL,
            providerUserId: email,
            providerEmail: email,
          },
        });
      }

      await tx.passwordSetupGrant.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.passwordSetupGrant.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    return {
      grantToken: rawGrantToken,
      expiresIn: PASSWORD_GRANT_LIFETIME_SECONDS,
    };
  }

  async setPassword(
    payload: SetPasswordRequestDto,
  ): Promise<SetPasswordResponseDto> {
    if (payload.password !== payload.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    const passwordMaterial = await this.hashPassword(payload.password);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const grant = await tx.passwordSetupGrant.findUnique({
        where: { tokenHash: hashGrantToken(payload.grantToken) },
      });

      if (!grant || grant.consumedAt || grant.expiresAt <= now) {
        throw new UnauthorizedException(
          'Password setup authorization is invalid or expired.',
        );
      }

      const consumed = await tx.passwordSetupGrant.updateMany({
        where: {
          id: grant.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          'Password setup authorization is invalid or expired.',
        );
      }

      await tx.userPassword.upsert({
        where: { userId: grant.userId },
        create: {
          userId: grant.userId,
          passwordHash: passwordMaterial.hash,
          passwordSalt: passwordMaterial.salt,
          algorithm: 'scrypt',
          version: 1,
          passwordChangedAt: now,
        },
        update: {
          passwordHash: passwordMaterial.hash,
          passwordSalt: passwordMaterial.salt,
          algorithm: 'scrypt',
          version: { increment: 1 },
          passwordChangedAt: now,
        },
      });

      // A password reset invalidates sessions that may exist on other devices.
      await tx.session.updateMany({
        where: { userId: grant.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return {
      success: true,
      message: 'Password saved. You can now sign in.',
    };
  }

  async authenticateWithPassword(
    payload: PasswordLoginRequestDto,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const email = normalizeEmail(payload.email);
    const user = await this.usersService.findActiveByEmail(email, undefined, {
      cancelPendingDeletionOnActivity: true,
    });
    const credential = user
      ? await this.prisma.userPassword.findUnique({
          where: { userId: user.id },
        })
      : null;

    const matches = await this.matchesPassword(
      payload.password,
      credential?.passwordSalt ?? DUMMY_PASSWORD_SALT,
      credential?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !credential || !matches) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    return this.openPasswordSession(user, metadata);
  }

  private async openPasswordSession(
    user: User,
    metadata: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
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

      return { user: updatedUser, tokens };
    });

    return AuthMapper.toAuthResponse(result.user, result.tokens);
  }

  private async hashPassword(
    password: string,
  ): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(16);
    const derivedKey = await deriveScryptKey(
      password,
      salt,
      PASSWORD_KEY_LENGTH,
    );

    return {
      hash: derivedKey.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  private async matchesPassword(
    password: string,
    saltValue: string,
    hashValue: string,
  ): Promise<boolean> {
    try {
      const storedHash = Buffer.from(hashValue, 'base64');
      const candidate = await deriveScryptKey(
        password,
        Buffer.from(saltValue, 'base64'),
        storedHash.length,
      );

      return (
        storedHash.length === candidate.length &&
        timingSafeEqual(storedHash, candidate)
      );
    } catch {
      return false;
    }
  }
}

function deriveScryptKey(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function hashGrantToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');

  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
