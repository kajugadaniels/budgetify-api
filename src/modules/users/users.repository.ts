import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

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
}
