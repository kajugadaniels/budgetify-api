import { Injectable } from '@nestjs/common';
import { Partnership, PartnershipStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

export type PartnershipWithUsers = Prisma.PartnershipGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        fullName: true;
        email: true;
        avatarUrl: true;
      };
    };
    partner: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        fullName: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  fullName: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class PartnershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(
    userId: string,
  ): Promise<PartnershipWithUsers | null> {
    return this.prisma.partnership.findFirst({
      where: {
        status: PartnershipStatus.ACCEPTED,
        OR: [{ ownerId: userId }, { partnerId: userId }],
      },
      include: {
        owner: { select: USER_SELECT },
        partner: { select: USER_SELECT },
      },
    });
  }

  async findAnyActiveByUserId(userId: string): Promise<Partnership | null> {
    return this.prisma.partnership.findFirst({
      where: {
        status: { in: [PartnershipStatus.PENDING, PartnershipStatus.ACCEPTED] },
        OR: [{ ownerId: userId }, { partnerId: userId }],
      },
    });
  }

  async findPendingByOwnerId(ownerId: string): Promise<Partnership | null> {
    return this.prisma.partnership.findFirst({
      where: { ownerId, status: PartnershipStatus.PENDING },
    });
  }

  async findPendingWithUsersByOwnerId(
    ownerId: string,
  ): Promise<PartnershipWithUsers | null> {
    return this.prisma.partnership.findFirst({
      where: { ownerId, status: PartnershipStatus.PENDING },
      include: {
        owner: { select: USER_SELECT },
        partner: { select: USER_SELECT },
      },
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PartnershipWithUsers | null> {
    return this.prisma.partnership.findFirst({
      where: { tokenHash, status: PartnershipStatus.PENDING },
      include: {
        owner: { select: USER_SELECT },
        partner: { select: USER_SELECT },
      },
    });
  }

  async findAcceptedByTokenHash(
    tokenHash: string,
  ): Promise<Partnership | null> {
    return this.prisma.partnership.findFirst({
      where: { tokenHash },
    });
  }

  async create(data: {
    ownerId: string;
    inviteeEmail: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Partnership> {
    return this.prisma.partnership.create({ data });
  }

  async accept(id: string, partnerId: string): Promise<Partnership> {
    return this.prisma.partnership.update({
      where: { id },
      data: { partnerId, status: PartnershipStatus.ACCEPTED },
    });
  }

  async revoke(id: string): Promise<Partnership> {
    return this.prisma.partnership.update({
      where: { id },
      data: { status: PartnershipStatus.REVOKED },
    });
  }
}
