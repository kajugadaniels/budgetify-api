import { Injectable } from '@nestjs/common';
import {
  PasswordSetupGrant,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor =
  | Prisma.TransactionClient
  | PrismaService;

@Injectable()
export class PasswordSetupGrantRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async invalidateActiveForUser(
    userId: string,
    consumedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await db.passwordSetupGrant.updateMany({
      where: {
        userId,

        consumedAt:
          null,
      },

      data: {
        consumedAt,
      },
    });
  }

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<PasswordSetupGrant> {
    return db.passwordSetupGrant.create({
      data: {
        userId,

        tokenHash,

        expiresAt,
      },
    });
  }

  async findByTokenHash(
    tokenHash: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<PasswordSetupGrant | null> {
    return db.passwordSetupGrant.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async consumeIfActive(
    grantId: string,
    consumedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    const result =
      await db.passwordSetupGrant.updateMany({
        where: {
          id:
            grantId,

          consumedAt:
            null,

          expiresAt: {
            gt:
              consumedAt,
          },
        },

        data: {
          consumedAt,
        },
      });

    return result.count ===
      1;
  }
}