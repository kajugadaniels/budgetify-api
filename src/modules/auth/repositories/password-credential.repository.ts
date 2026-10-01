import { Injectable } from '@nestjs/common';
import {
  Prisma,
  UserPassword,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor =
  | Prisma.TransactionClient
  | PrismaService;

export interface PasswordMaterial {
  hash: string;

  salt: string;
}

@Injectable()
export class PasswordCredentialRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async existsByUserId(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    const credential =
      await db.userPassword.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
        },
      });

    return credential !==
      null;
  }

  async findByUserId(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<UserPassword | null> {
    return db.userPassword.findUnique({
      where: {
        userId,
      },
    });
  }

  async upsert(
    userId: string,
    password: PasswordMaterial,
    changedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<UserPassword> {
    return db.userPassword.upsert({
      where: {
        userId,
      },

      create: {
        userId,

        passwordHash:
          password.hash,

        passwordSalt:
          password.salt,

        algorithm:
          'scrypt',

        version:
          1,

        passwordChangedAt:
          changedAt,
      },

      update: {
        passwordHash:
          password.hash,

        passwordSalt:
          password.salt,

        algorithm:
          'scrypt',

        version: {
          increment:
            1,
        },

        passwordChangedAt:
          changedAt,
      },
    });
  }
}