import { Injectable } from '@nestjs/common';
import { PartnershipStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { UserPrismaExecutor } from '../types/user-service.types';

@Injectable()
export class UserAccountDeletionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findIdsDueForDeletion(
    scheduledBefore: Date,
    limit = 100,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<string[]> {
    const users = await db.user.findMany({
      where: {
        deletedAt: null,

        accountDeletionScheduledFor: {
          lte: scheduledBefore,
        },
      },

      select: {
        id: true,
      },

      orderBy: {
        accountDeletionScheduledFor: 'asc',
      },

      take: limit,
    });

    return users.map((user) => user.id);
  }

  async revokeSessions(
    userId: string,
    revokedAt: Date,
    db: UserPrismaExecutor = this.prisma,
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

  async revokePartnerships(
    userId: string,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.partnership.updateMany({
      where: {
        status: {
          in: [PartnershipStatus.PENDING, PartnershipStatus.ACCEPTED],
        },

        OR: [
          {
            ownerId: userId,
          },
          {
            partnerId: userId,
          },
        ],
      },

      data: {
        status: PartnershipStatus.REVOKED,

        partnerId: null,
      },
    });
  }
}
