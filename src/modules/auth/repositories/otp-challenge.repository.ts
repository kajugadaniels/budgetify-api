import { Injectable } from '@nestjs/common';
import { LoginOtpChallenge, PendingUser, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

interface CreateOtpChallengeInput {
  otpHash: string;

  otpExpiresAt: Date;
}

@Injectable()
export class OtpChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertLoginChallenge(
    userId: string,
    input: CreateOtpChallengeInput,
  ): Promise<LoginOtpChallenge> {
    return this.prisma.loginOtpChallenge.upsert({
      where: {
        userId,
      },

      create: {
        userId,

        otpHash: input.otpHash,

        otpExpiresAt: input.otpExpiresAt,

        attemptCount: 0,
      },

      update: {
        otpHash: input.otpHash,

        otpExpiresAt: input.otpExpiresAt,

        attemptCount: 0,
      },
    });
  }

  async upsertRegisterChallenge(
    email: string,
    input: CreateOtpChallengeInput,
  ): Promise<PendingUser> {
    return this.prisma.pendingUser.upsert({
      where: {
        email,
      },

      create: {
        email,

        otpHash: input.otpHash,

        otpExpiresAt: input.otpExpiresAt,

        attemptCount: 0,
      },

      update: {
        otpHash: input.otpHash,

        otpExpiresAt: input.otpExpiresAt,

        attemptCount: 0,
      },
    });
  }

  async findLoginChallenge(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<LoginOtpChallenge | null> {
    return db.loginOtpChallenge.findUnique({
      where: {
        userId,
      },
    });
  }

  async findRegisterChallenge(
    email: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<PendingUser | null> {
    return db.pendingUser.findUnique({
      where: {
        email,
      },
    });
  }

  async deleteLoginChallenge(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await db.loginOtpChallenge.delete({
      where: {
        userId,
      },
    });
  }

  async deleteRegisterChallenge(
    email: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<void> {
    await db.pendingUser.delete({
      where: {
        email,
      },
    });
  }

  async incrementAttemptsByHash(otpHash: string): Promise<void> {
    await this.prisma.loginOtpChallenge.updateMany({
      where: {
        otpHash,
      },

      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });

    await this.prisma.pendingUser.updateMany({
      where: {
        otpHash,
      },

      data: {
        attemptCount: {
          increment: 1,
        },
      },
    });
  }
}
