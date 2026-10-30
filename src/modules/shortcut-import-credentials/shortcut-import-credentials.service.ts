import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { ShortcutImportCredential } from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateShortcutImportCredentialDto,
  ShortcutImportCredentialStatus,
} from './shortcut-import-credential.dto';
import { ShortcutImportCredentialTokenService } from './shortcut-import-credential-token.service';

const MAX_TRANSACTION_ATTEMPTS = 5;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ShortcutImportCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ShortcutImportCredentialTokenService,
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  async create(userId: string, body: CreateShortcutImportCredentialDto) {
    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
      const generated = this.tokens.generate();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() +
          this.config.credentialLifetimeDays * MILLISECONDS_PER_DAY,
      );

      try {
        const credential = await this.prisma.$transaction(
          async (tx) => {
            const activeCredentialCount =
              await tx.shortcutImportCredential.count({
                where: {
                  userId,
                  revokedAt: null,
                  expiresAt: { gt: now },
                },
              });

            if (activeCredentialCount >= this.config.maximumActiveCredentials) {
              throw new ConflictException(
                `You can connect up to ${this.config.maximumActiveCredentials} active iPhones. Revoke an old device before adding another one.`,
              );
            }

            return tx.shortcutImportCredential.create({
              data: {
                userId,
                deviceName: body.deviceName,
                tokenPrefix: generated.tokenPrefix,
                tokenHash: generated.tokenHash,
                expiresAt,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return {
          ...this.toResponse(credential, now),
          token: generated.token,
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034') &&
          attempt < MAX_TRANSACTION_ATTEMPTS - 1
        ) {
          continue;
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          throw new ConflictException(
            'The iPhone credential list changed during this request. Please try again.',
          );
        }

        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Could not generate a unique iPhone Shortcut credential. Please try again.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Could not generate a unique iPhone Shortcut credential. Please try again.',
    );
  }

  async list(userId: string) {
    const now = new Date();
    const credentials = await this.prisma.shortcutImportCredential.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return credentials.map((credential) => this.toResponse(credential, now));
  }

  async revoke(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const credential = await tx.shortcutImportCredential.findFirst({
        where: { id, userId },
        select: { id: true, revokedAt: true },
      });

      if (!credential) {
        throw new NotFoundException(
          'The iPhone Shortcut credential was not found.',
        );
      }

      if (credential.revokedAt) {
        return;
      }

      await tx.shortcutImportCredential.update({
        where: { id: credential.id },
        data: { revokedAt: new Date() },
      });
    });
  }

  private toResponse(credential: ShortcutImportCredential, now: Date) {
    return {
      id: credential.id,
      deviceName: credential.deviceName,
      tokenPrefix: credential.tokenPrefix,
      status: this.status(credential, now),
      lastUsedAt: credential.lastUsedAt,
      expiresAt: credential.expiresAt,
      revokedAt: credential.revokedAt,
      createdAt: credential.createdAt,
    };
  }

  private status(
    credential: ShortcutImportCredential,
    now: Date,
  ): ShortcutImportCredentialStatus {
    if (credential.revokedAt) {
      return ShortcutImportCredentialStatus.REVOKED;
    }

    if (credential.expiresAt <= now) {
      return ShortcutImportCredentialStatus.EXPIRED;
    }

    return ShortcutImportCredentialStatus.ACTIVE;
  }
}
