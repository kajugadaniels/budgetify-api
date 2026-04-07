import { Injectable } from '@nestjs/common';
import { PartnershipStatus, Prisma, User } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(
    email: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<User | null> {
    return db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async create(
    data: Prisma.UserCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<User> {
    return db.user.create({ data });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }

  async findIdsDueForAccountDeletion(
    scheduledBefore: Date,
    limit = 100,
    db: PrismaExecutor = this.prisma,
  ): Promise<string[]> {
    const users = await db.user.findMany({
      where: {
        deletedAt: null,
        accountDeletionScheduledFor: {
          lte: scheduledBefore,
        },
      },
      select: { id: true },
      orderBy: { accountDeletionScheduledFor: 'asc' },
      take: limit,
    });

    return users.map((user) => user.id);
  }

  async revokeSessionsByUserId(
    userId: string,
    revokedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }

  async revokePartnershipsByUserId(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.partnership.updateMany({
      where: {
        status: {
          in: [PartnershipStatus.PENDING, PartnershipStatus.ACCEPTED],
        },
        OR: [{ ownerId: userId }, { partnerId: userId }],
      },
      data: {
        status: PartnershipStatus.REVOKED,
        partnerId: null,
      },
    });
  }
}
