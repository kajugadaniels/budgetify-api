import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { UserPrismaExecutor } from './types/user-service.types';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<User | null> {
    return db.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findByEmail(
    email: string,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<User | null> {
    return db.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async create(
    data: Prisma.UserCreateInput,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<User> {
    return db.user.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    db: UserPrismaExecutor = this.prisma,
  ): Promise<User> {
    return db.user.update({
      where: {
        id,
      },

      data,
    });
  }
}
